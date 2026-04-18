import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Dedup delle email charter processate. Chiave = sha256(Message-ID) per
 * evitare di salvare l'header raw (puo' contenere PII del mittente).
 *
 * `markMessageProcessed` usa insert-first con catch P2002 per garantire
 * idempotenza anche in caso di race tra due run del cron paralleli (non
 * dovrebbe succedere grazie al lease Redis, ma defense-in-depth).
 */
export function hashMessageId(messageId: string): string {
  return crypto.createHash("sha256").update(messageId).digest("hex");
}

export async function wasMessageProcessed(messageId: string): Promise<boolean> {
  const row = await db.processedCharterEmail.findUnique({
    where: { messageHash: hashMessageId(messageId) },
    select: { messageHash: true },
  });
  return row !== null;
}

export async function markMessageProcessed(
  messageId: string,
  platform?: string,
): Promise<void> {
  try {
    await db.processedCharterEmail.create({
      data: {
        messageHash: hashMessageId(messageId),
        platform: platform ?? null,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return; // gia' processata da un run concorrente — OK.
    }
    throw err;
  }
}
