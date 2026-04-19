import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Telegram Bot API stub. Se il cliente non configura
 * `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` (default), diventa no-op con
 * warn log. In produzione il dispatcher puo' ignorare questo canale.
 *
 * R14-REG-C1: ritorna `boolean` (true = confermato consegnato, false = skip
 * o errore). Il dispatcher usa questo per popolare `DispatchResult.anyOk`.
 * Prima ritornava `void` e catturava internamente gli errori → il caller
 * weather-check interpretava "resolved" come "delivered" anche quando
 * TELEGRAM_BOT_TOKEN era unset (stato attuale) → marker `anyOk=true`
 * falso-positivo → alert dedup bug.
 *
 * Plan 6+ deferred: creare bot Telegram, fornire credenziali.
 */
export async function sendTelegramMessage(text: string): Promise<boolean> {
  const token = env.TELEGRAM_BOT_TOKEN;
  const chatId = env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) {
    logger.debug("Telegram not configured, skipping message");
    return false;
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
      logger.warn({ status: res.status }, "Telegram send non-2xx");
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err: (err as Error).message }, "Telegram send failed");
    return false;
  }
}
