import "dotenv/config";
import { env } from "../src/lib/env";
import { sendTelegramMessage } from "../src/lib/notifications/telegram";

interface TelegramChat {
  id: number | string;
  type?: string;
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

interface TelegramUpdate {
  update_id: number;
  message?: { chat?: TelegramChat };
  channel_post?: { chat?: TelegramChat };
  edited_message?: { chat?: TelegramChat };
  my_chat_member?: { chat?: TelegramChat };
}

function chatLabel(chat: TelegramChat): string {
  const name =
    chat.title ??
    [chat.first_name, chat.last_name].filter(Boolean).join(" ") ??
    chat.username ??
    "chat";
  return `${chat.id} (${chat.type ?? "unknown"} · ${name})`;
}

async function printUpdates(token: string): Promise<void> {
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    throw new Error(`Telegram getUpdates failed with status ${res.status}`);
  }

  const body = (await res.json()) as { ok: boolean; result?: TelegramUpdate[] };
  const chats = new Map<string, TelegramChat>();

  for (const update of body.result ?? []) {
    const chat =
      update.message?.chat ??
      update.channel_post?.chat ??
      update.edited_message?.chat ??
      update.my_chat_member?.chat;
    if (chat) chats.set(String(chat.id), chat);
  }

  if (chats.size === 0) {
    console.log("Nessuna chat trovata.");
    console.log("Apri Telegram, scrivi un messaggio al bot o nel gruppo, poi rilancia:");
    console.log("  npm run telegram:smoke -- --updates");
    return;
  }

  console.log("Chat disponibili:");
  for (const chat of chats.values()) {
    console.log(`- TELEGRAM_CHAT_ID=${chatLabel(chat)}`);
  }
}

async function main() {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.error("Configura TELEGRAM_BOT_TOKEN in .env prima di continuare.");
    process.exit(1);
  }

  if (process.argv.includes("--updates") || !env.TELEGRAM_CHAT_ID) {
    await printUpdates(env.TELEGRAM_BOT_TOKEN);
    return;
  }

  const message =
    process.argv.filter((arg) => !arg.startsWith("--")).slice(2).join(" ") ||
    `<b>Egadisailing</b>\nTest notifiche Telegram riuscito.\n${new Date().toISOString()}`;
  const delivered = await sendTelegramMessage(message);
  if (!delivered) {
    console.error("Messaggio Telegram non consegnato. Controlla token/chat_id.");
    process.exit(1);
  }
  console.log("Messaggio Telegram consegnato.");
}

main().catch((err) => {
  console.error((err as Error).message);
  process.exit(1);
});
