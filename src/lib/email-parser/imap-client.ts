import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

export interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  tls: boolean;
}

export interface FetchedEmail {
  uid: number;
  messageId: string;
  from: string;
  subject: string;
  html: string | null;
  text: string | null;
  date: Date | null;
  raw: ParsedMail;
}

const FETCH_TIMEOUT_MS = 30_000;
const MAX_EMAILS_PER_RUN = 100;

export function imapConfigFromEnv(): ImapConfig | null {
  if (!env.IMAP_HOST || !env.IMAP_USER || !env.IMAP_PASSWORD) return null;
  return {
    host: env.IMAP_HOST,
    port: parseInt(env.IMAP_PORT, 10),
    user: env.IMAP_USER,
    password: env.IMAP_PASSWORD,
    tls: env.IMAP_TLS,
  };
}

/**
 * Fetch email UNSEEN dal mailbox INBOX usando `imapflow` (promise-native,
 * no utf7 vulns come `node-imap`). Ritorna max MAX_EMAILS_PER_RUN per run.
 *
 * NON marca come SEEN — il caller deve chiamare `markEmailsSeen` solo dopo
 * il successo del processing per garantire at-least-once delivery.
 */
export async function fetchUnseenEmails(config: ImapConfig): Promise<FetchedEmail[]> {
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.tls,
    auth: { user: config.user, pass: config.password },
    logger: false,
    emitLogs: false,
  });

  const emails: FetchedEmail[] = [];
  const deadline = Date.now() + FETCH_TIMEOUT_MS;

  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      let count = 0;
      for await (const msg of client.fetch(
        { seen: false },
        { source: true, uid: true, envelope: true },
      )) {
        if (count >= MAX_EMAILS_PER_RUN) break;
        if (Date.now() > deadline) {
          logger.warn({ fetched: count }, "IMAP fetch timeout, stopping");
          break;
        }
        if (!msg.source) continue;
        try {
          const parsed = await simpleParser(msg.source);
          const fromAddr = parsed.from?.value?.[0]?.address ?? "";
          emails.push({
            uid: Number(msg.uid),
            messageId: parsed.messageId ?? `no-id-${Date.now()}-${msg.uid}`,
            from: fromAddr.toLowerCase(),
            subject: parsed.subject ?? "",
            html: typeof parsed.html === "string" ? parsed.html : null,
            text: parsed.text ?? null,
            date: parsed.date ?? null,
            raw: parsed,
          });
          count++;
        } catch (err) {
          logger.error({ err, uid: msg.uid }, "Email parse failed, skipping");
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }

  return emails;
}

/**
 * Marca N UID come \Seen in INBOX. Chiamare DOPO processing riuscito.
 */
export async function markEmailsSeen(config: ImapConfig, uids: number[]): Promise<void> {
  if (uids.length === 0) return;
  const client = new ImapFlow({
    host: config.host,
    port: config.port,
    secure: config.tls,
    auth: { user: config.user, pass: config.password },
    logger: false,
    emitLogs: false,
  });
  try {
    await client.connect();
    const lock = await client.getMailboxLock("INBOX");
    try {
      await client.messageFlagsAdd({ uid: uids.map(String).join(",") }, ["\\Seen"], {
        uid: true,
      });
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(() => {});
  }
}
