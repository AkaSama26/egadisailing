import crypto from "node:crypto";
import { ImapFlow } from "imapflow";
import { simpleParser, type ParsedMail } from "mailparser";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { swallow } from "@/lib/result";

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
// Cap anti-bomb: blocca email sospette oltre 5MB (template SamBoat ~15KB).
const MAX_MESSAGE_SIZE_BYTES = 5_000_000;
// Cap al parsing HTML dentro simpleParser.
const MAX_HTML_PARSER_BYTES = 1_000_000;
// Chunk per UID SET IMAP (server imprecisi su liste lunghe).
const MARK_SEEN_CHUNK_SIZE = 500;

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
        if (msg.source.length > MAX_MESSAGE_SIZE_BYTES) {
          logger.warn(
            { uid: msg.uid, size: msg.source.length },
            "Email exceeds max size, skipping (possible HTML bomb)",
          );
          continue;
        }
        try {
          const parsed = await simpleParser(msg.source, {
            maxHtmlLengthToParse: MAX_HTML_PARSER_BYTES,
            skipImageLinks: true,
            skipTextToHtml: true,
          });
          const fromAddr = parsed.from?.value?.[0]?.address ?? "";
          emails.push({
            uid: Number(msg.uid),
            // Message-ID fallback: random UUID per evitare collision tra email
            // multiple arrivate senza header Message-ID nello stesso ms.
            messageId: parsed.messageId ?? `no-id-${crypto.randomUUID()}`,
            from: fromAddr.toLowerCase(),
            subject: parsed.subject ?? "",
            html: typeof parsed.html === "string" ? parsed.html : null,
            text: parsed.text ?? null,
            date: parsed.date ?? null,
            raw: parsed,
          });
          count++;
        } catch (err) {
          logger.error({ uid: msg.uid, errMessage: (err as Error).message }, "Email parse failed, skipping");
        }
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(swallow("imap-client fetch logout"));
  }

  return emails;
}

/**
 * Marca N UID come \Seen in INBOX. Chiamare DOPO processing riuscito.
 *
 * Paginazione: server IMAP hanno limite sulla lunghezza UID SET (CSV nella
 * command line). Chunk di MARK_SEEN_CHUNK_SIZE evita fallimenti su backlog
 * grandi (bootstrap produzione con 10k UNSEEN email).
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
      for (let i = 0; i < uids.length; i += MARK_SEEN_CHUNK_SIZE) {
        const chunk = uids.slice(i, i + MARK_SEEN_CHUNK_SIZE);
        await client.messageFlagsAdd({ uid: chunk.map(String).join(",") }, ["\\Seen"], {
          uid: true,
        });
      }
    } finally {
      lock.release();
    }
  } finally {
    await client.logout().catch(swallow("imap-client markSeen logout"));
  }
}
