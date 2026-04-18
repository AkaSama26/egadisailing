import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Telegram Bot API stub. Se il cliente non configura
 * `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (default), diventa no-op con
 * warn log. In produzione il dispatcher puo' ignorare questo canale.
 *
 * Plan 6+ deferred: creare bot Telegram, fornire credenziali.
 */
export async function sendTelegramMessage(text: string): Promise<void> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    logger.debug("Telegram not configured, skipping message");
    return;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      logger.warn({ status: res.status, body: body.slice(0, 500) }, "Telegram send non-2xx");
    }
  } catch (err) {
    logger.error({ err: (err as Error).message }, "Telegram send failed");
  }
}
