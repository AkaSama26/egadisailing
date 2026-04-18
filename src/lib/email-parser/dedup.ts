import crypto from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";

/**
 * Dedup delle email charter processate. Chiave = sha256(Message-ID|from) per
 * non salvare header raw (PII) E limitare attacchi di dedup poisoning:
 * un attaccante che conosce il Message-ID atteso di SamBoat non puo'
 * bloccare l'email legittima mandando un proprio Message-ID identico da un
 * mittente diverso — gli hash divergono.
 *
 * `markMessageProcessed` usa insert-first con catch P2002 per idempotenza
 * anche in caso di race tra due run paralleli (non dovrebbe succedere
 * grazie al lease Redis, ma defense-in-depth).
 */
export function hashMessageKey(messageId: string, from: string): string {
  const normalized = `${messageId}|${from.toLowerCase().trim()}`;
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

export async function wasMessageProcessed(
  messageId: string,
  from: string,
): Promise<boolean> {
  const row = await db.processedCharterEmail.findUnique({
    where: { messageHash: hashMessageKey(messageId, from) },
    select: { messageHash: true },
  });
  return row !== null;
}

export async function markMessageProcessed(
  messageId: string,
  from: string,
  platform?: string,
): Promise<void> {
  try {
    await db.processedCharterEmail.create({
      data: {
        messageHash: hashMessageKey(messageId, from),
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
