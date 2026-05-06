import crypto from "node:crypto";
import net from "node:net";
import tls from "node:tls";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { ExternalServiceError } from "@/lib/errors";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const SMTP_TIMEOUT_MS = 15_000;

// R24-A3-A1: strip newline + control chars da toName per difesa header
// injection. Brevo REST dovrebbe gestirlo ma documentazione warn +
// altri provider (Mailgun, SendGrid) lo hanno avuto come CVE passato.
function safePlain(s: string): string {
  return s.replace(/[\r\n]+/g, " ").replace(/[\u0000-\u001F]/g, " ").trim();
}

function safeHeader(s: string): string {
  return safePlain(s).replace(/"/g, "'");
}

function encodeHeader(s: string): string {
  const safe = safeHeader(s);
  return /^[\x20-\x7E]*$/.test(safe)
    ? safe
    : `=?UTF-8?B?${Buffer.from(safe, "utf8").toString("base64")}?=`;
}

function formatAddress(email: string, name?: string): string {
  const safeName = name ? safeHeader(name) : "";
  if (!safeName) return `<${email}>`;

  const encodedName = encodeHeader(safeName);
  return encodedName.startsWith("=?")
    ? `${encodedName} <${email}>`
    : `"${encodedName}" <${email}>`;
}

function normalizeBodyLines(content: string): string {
  return content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").replace(/\n/g, "\r\n");
}

function dotStuff(content: string): string {
  return normalizeBodyLines(content)
    .split("\r\n")
    .map((line) => (line.startsWith(".") ? `.${line}` : line))
    .join("\r\n");
}

function buildSmtpMessage(opts: SendEmailOptions): { message: string; messageId: string } {
  const boundary = `egadisailing-${crypto.randomBytes(16).toString("hex")}`;
  const messageId = `<${crypto.randomUUID()}@egadisailing.com>`;
  const replyTo =
    opts.replyTo ??
    (env.BREVO_REPLY_TO
      ? { email: env.BREVO_REPLY_TO }
      : { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME });

  const headers = [
    `From: ${formatAddress(env.BREVO_SENDER_EMAIL, env.BREVO_SENDER_NAME)}`,
    `To: ${formatAddress(opts.to, opts.toName)}`,
    `Reply-To: ${formatAddress(replyTo.email, replyTo.name)}`,
    `Subject: ${encodeHeader(opts.subject)}`,
    `Message-ID: ${messageId}`,
    "MIME-Version: 1.0",
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
  ];

  const text = opts.textContent ?? opts.htmlContent.replace(/<[^>]*>/g, " ");
  const message = [
    ...headers,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizeBodyLines(text),
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: 8bit",
    "",
    normalizeBodyLines(opts.htmlContent),
    `--${boundary}--`,
    "",
  ].join("\r\n");

  return { message, messageId };
}

class SmtpSession {
  private socket: net.Socket;
  private buffer = "";

  private constructor(socket: net.Socket) {
    this.socket = socket;
    this.socket.setEncoding("utf8");
  }

  static async connect(): Promise<SmtpSession> {
    const socket =
      env.BREVO_SMTP_PORT === 465
        ? tls.connect({
            host: env.BREVO_SMTP_HOST,
            port: env.BREVO_SMTP_PORT,
            servername: env.BREVO_SMTP_HOST,
            timeout: SMTP_TIMEOUT_MS,
          })
        : net.connect({
            host: env.BREVO_SMTP_HOST,
            port: env.BREVO_SMTP_PORT,
            timeout: SMTP_TIMEOUT_MS,
          });

    const session = new SmtpSession(socket);
    await session.waitForReady();
    await session.readResponse(220);
    return session;
  }

  async startTlsIfNeeded(): Promise<void> {
    if (this.socket instanceof tls.TLSSocket) return;

    await this.command("EHLO egadisailing.com", 250);
    await this.command("STARTTLS", 220);

    const tlsSocket = tls.connect({
      socket: this.socket,
      servername: env.BREVO_SMTP_HOST,
      timeout: SMTP_TIMEOUT_MS,
    });
    this.socket = tlsSocket;
    this.socket.setEncoding("utf8");
    this.buffer = "";
    await this.waitForReady();
  }

  async command(command: string, expected: number | number[]): Promise<string> {
    this.socket.write(`${command}\r\n`);
    return this.readResponse(expected);
  }

  async data(message: string): Promise<string> {
    await this.command("DATA", 354);
    this.socket.write(`${dotStuff(message)}\r\n.\r\n`);
    return this.readResponse(250);
  }

  async quit(): Promise<void> {
    await this.command("QUIT", 221).catch(() => undefined);
    this.socket.end();
  }

  destroy(): void {
    this.socket.destroy();
  }

  private waitForReady(): Promise<void> {
    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.socket.off("secureConnect", onReady);
        this.socket.off("connect", onReady);
        this.socket.off("timeout", onTimeout);
        this.socket.off("error", onError);
      };
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onTimeout = () => {
        cleanup();
        reject(new Error("SMTP connection timeout"));
      };
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };

      if (this.socket instanceof tls.TLSSocket) {
        this.socket.once("secureConnect", onReady);
      } else {
        this.socket.once("connect", onReady);
      }
      this.socket.once("timeout", onTimeout);
      this.socket.once("error", onError);
    });
  }

  private readResponse(expected: number | number[]): Promise<string> {
    const expectedCodes = Array.isArray(expected) ? expected : [expected];

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        this.socket.off("data", onData);
        this.socket.off("error", onError);
      };
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error("SMTP response timeout"));
      }, SMTP_TIMEOUT_MS);
      const onError = (err: Error) => {
        cleanup();
        reject(err);
      };
      const onData = (chunk: Buffer | string) => {
        this.buffer += chunk.toString();
        const lines = this.buffer.split(/\r?\n/);
        const lastComplete = this.buffer.endsWith("\n");
        if (!lastComplete) {
          this.buffer = lines.pop() ?? "";
        } else {
          this.buffer = "";
        }

        const responseLines = lastComplete ? lines.filter(Boolean) : lines.filter(Boolean);
        const terminal = responseLines.find((line) => /^\d{3} /.test(line));
        if (!terminal) return;

        const code = Number(terminal.slice(0, 3));
        cleanup();
        const response = responseLines.join("\n");
        if (expectedCodes.includes(code)) resolve(response);
        else reject(new Error(`SMTP unexpected response ${code}`));
      };

      this.socket.on("data", onData);
      this.socket.once("error", onError);
    });
  }
}

export interface SendEmailOptions {
  to: string;
  toName?: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  /** R22-A4-ALTA-1: override `replyTo` per contact form (cliente email)
   *  cosi' admin fa Reply nativo invece di copia/incolla from-line. Se non
   *  impostato fallback a `BREVO_REPLY_TO` env (default sender). */
  replyTo?: { email: string; name?: string };
}

export interface SendEmailResult {
  delivered: boolean;
  messageId?: string;
}

/**
 * Invia email transazionale via Brevo REST API.
 *
 * Failure-safe per design: in development con `EMAIL_DELIVERY_MODE=log`
 * registra l'invio simulato e ritorna delivered=true senza chiamare Brevo.
 * In production rilancia ExternalServiceError (il chiamante decide se
 * bloccare).
 *
 * R14-REG-C1: ritorna `boolean` (true = consegnato a Brevo 2xx, false =
 * dev skip). `throw` invece di `return false` solo in prod con errori
 * upstream effettivi - cosi' il dispatcher distingue skip da fail e il
 * caller non marca falsi "anyOk=true".
 */
export async function sendEmail(opts: SendEmailOptions): Promise<boolean> {
  const result = await sendEmailWithResult(opts);
  return result.delivered;
}

export async function sendEmailWithResult(opts: SendEmailOptions): Promise<SendEmailResult> {
  if (env.EMAIL_DELIVERY_MODE === "log") {
    const messageId = `dev-log-${Date.now().toString(36)}`;
    logger.info(
      { subject: opts.subject, messageId },
      "Email delivery log mode - Brevo API not called",
    );
    return { delivered: true, messageId };
  }

  if (env.EMAIL_DELIVERY_MODE === "smtp") {
    return sendEmailViaSmtp(opts);
  }

  if (!env.BREVO_API_KEY) {
    // In production env.ts fa fail-fast. In dev/staging, se qualcuno forza
    // EMAIL_DELIVERY_MODE=brevo senza key, falliamo forte invece di creare
    // falsi SENT.
    throw new ExternalServiceError("Brevo", "BREVO_API_KEY not configured");
  }

  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": env.BREVO_API_KEY,
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({
        sender: { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME },
        // R24-A3-A1 + R24-P2-MEDIA: defense-in-depth anti header-injection.
        // `toName` deriva da `Customer.firstName + lastName`. Brevo REST
        // accetta JSON quindi CRLF nel campo non inietta header a livello
        // edge, ma internamente Brevo costruisce RFC5322 - documentazione
        // warn su newline. safePlain strip \r\n + control chars. Se dopo
        // sanitize la stringa e' vuota (whitespace-only input), passiamo
        // `undefined` per evitare "From  <email>" con name vuoto nel MUA.
        to: [{
          email: opts.to,
          name: opts.toName ? (safePlain(opts.toName) || undefined) : undefined,
        }],
        // R12-A3: replyTo dedicato cosi' le risposte cliente non finiscono
        // nel mailbox "noreply". R22-A4-ALTA-1: il caller puo' override
        // (contact form → replyTo = email cliente per abilitare Reply).
        replyTo:
          opts.replyTo ??
          (env.BREVO_REPLY_TO
            ? { email: env.BREVO_REPLY_TO }
            : { email: env.BREVO_SENDER_EMAIL, name: env.BREVO_SENDER_NAME }),
        subject: opts.subject,
        htmlContent: opts.htmlContent,
        textContent: opts.textContent,
      }),
    });

    if (!res.ok) {
      // R14-Area1-ALTA: body Brevo 4xx spesso include l'email destinataria
      // e estratti del contenuto - niente raw body nel log. Solo status +
      // primo codice/messaggio JSON se presente.
      const errorBody = await res.text().catch(() => "");
      let code: string | undefined;
      try {
        const parsed = JSON.parse(errorBody) as { code?: string; message?: string };
        code = parsed.code ?? parsed.message?.slice(0, 120);
      } catch {
        code = errorBody.slice(0, 120);
      }
      logger.error(
        { status: res.status, brevoCode: code },
        "Brevo send failed",
      );
      throw new ExternalServiceError("Brevo", `send failed (${res.status})`);
    }

    let messageId: string | undefined;
    try {
      const body = (await res.json()) as { messageId?: string };
      messageId = body.messageId;
    } catch {
      messageId = undefined;
    }

    // R14-Area1-CRITICA: niente email in chiaro nei log. Subject OK (non-PII
    // per template admin/customer generici).
    logger.info({ subject: opts.subject, messageId }, "Email sent");
    return { delivered: true, messageId };
  } catch (err) {
    if (err instanceof ExternalServiceError) throw err;
    logger.error({ err: (err as Error).message }, "Brevo sendEmail failed");
    throw new ExternalServiceError("Brevo", "sendEmail failed");
  }
}

async function sendEmailViaSmtp(opts: SendEmailOptions): Promise<SendEmailResult> {
  if (!env.BREVO_SMTP_USER || !env.BREVO_SMTP_KEY) {
    throw new ExternalServiceError("Brevo SMTP", "SMTP credentials not configured");
  }

  let session: SmtpSession | undefined;
  const { message, messageId } = buildSmtpMessage(opts);

  try {
    session = await SmtpSession.connect();
    await session.startTlsIfNeeded();
    await session.command("EHLO egadisailing.com", 250);
    await session.command("AUTH LOGIN", 334);
    await session.command(Buffer.from(env.BREVO_SMTP_USER, "utf8").toString("base64"), 334);
    await session.command(Buffer.from(env.BREVO_SMTP_KEY, "utf8").toString("base64"), 235);
    await session.command(`MAIL FROM:<${env.BREVO_SENDER_EMAIL}>`, 250);
    await session.command(`RCPT TO:<${opts.to}>`, [250, 251]);
    await session.data(message);
    await session.quit();

    logger.info({ subject: opts.subject, messageId }, "Email sent via Brevo SMTP");
    return { delivered: true, messageId };
  } catch (err) {
    session?.destroy();
    logger.error({ err: (err as Error).message }, "Brevo SMTP send failed");
    throw new ExternalServiceError("Brevo SMTP", "send failed");
  }
}
