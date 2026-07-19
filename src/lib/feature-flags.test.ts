import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({
  env: {
    BOATAROUND_SYNC_ENABLED: false,
    BOATAROUND_API_TOKEN: "configured-token",
    BOATAROUND_WEBHOOK_SECRET: "configured-secret",
    IMAP_INGEST_ENABLED: false,
    IMAP_HOST: "imap.example.test",
    IMAP_PORT: "993",
    IMAP_USER: "configured-user",
    IMAP_PASSWORD: "configured-password",
    IMAP_TLS: true,
    TELEGRAM_NOTIFICATIONS_ENABLED: false,
    TELEGRAM_BOT_TOKEN: "configured-token",
    TELEGRAM_CHAT_ID: "configured-chat",
  },
}));

import { isBoataroundConfigured } from "@/lib/boataround/client";
import { imapConfigFromEnv } from "@/lib/email-parser/imap-client";
import { defaultNotificationChannels } from "@/lib/notifications/dispatcher";
import { sendTelegramMessage } from "@/lib/notifications/telegram";

describe("external integration kill switches", () => {
  it("non abilita Boataround con sole credenziali residue", () => {
    expect(isBoataroundConfigured()).toBe(false);
  });

  it("non costruisce config IMAP con ingest disabilitato", () => {
    expect(imapConfigFromEnv()).toBeNull();
  });

  it("esclude Telegram dai default e non chiama fetch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    expect(defaultNotificationChannels()).toEqual(["EMAIL"]);
    await expect(sendTelegramMessage("test")).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});
