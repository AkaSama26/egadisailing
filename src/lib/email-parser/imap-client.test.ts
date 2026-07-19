import { describe, expect, it } from "vitest";
import { ImapFlow } from "imapflow";
import { parseEmailSource } from "./imap-client";

const MIME_FIXTURE = Buffer.from(
  [
    "From: SamBoat <booking@samboat.example>",
    "To: bookings@egadisailing.com",
    "Subject: =?UTF-8?Q?Nuova_prenotazione_=E2=9B=B5?=",
    "Message-ID: <fixture-20260719@samboat.example>",
    "Date: Sun, 19 Jul 2026 12:30:00 +0200",
    "MIME-Version: 1.0",
    'Content-Type: multipart/alternative; boundary="fixture-boundary"',
    "",
    "--fixture-boundary",
    'Content-Type: text/plain; charset="utf-8"',
    "Content-Transfer-Encoding: quoted-printable",
    "",
    "Prenotazione confermata per Andr=C3=A9 Rossi.",
    "--fixture-boundary",
    'Content-Type: text/html; charset="utf-8"',
    "Content-Transfer-Encoding: quoted-printable",
    "",
    "<p>Prenotazione <strong>confermata</strong> per Andr=C3=A9 Rossi.</p>",
    "--fixture-boundary--",
    "",
  ].join("\r\n"),
);

describe("IMAP/mail MIME compatibility", () => {
  it("parsa una fixture multipart reale con mailparser 3.9", async () => {
    const email = await parseEmailSource(42, MIME_FIXTURE);

    expect(email).toMatchObject({
      uid: 42,
      messageId: "<fixture-20260719@samboat.example>",
      from: "booking@samboat.example",
      subject: "Nuova prenotazione ⛵",
    });
    expect(email.text).toContain("André Rossi");
    expect(email.html).toContain("<strong>confermata</strong>");
    expect(email.date?.toISOString()).toBe("2026-07-19T10:30:00.000Z");
  });

  it("costruisce il client con l'API ImapFlow aggiornata senza aprire rete", () => {
    const client = new ImapFlow({
      host: "imap.example.test",
      port: 993,
      secure: true,
      auth: { user: "fixture", pass: "fixture" },
      logger: false,
      emitLogs: false,
    });

    expect(client).toBeInstanceOf(ImapFlow);
  });
});
