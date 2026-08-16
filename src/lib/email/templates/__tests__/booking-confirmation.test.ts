import { describe, expect, it } from "vitest";
import { bookingConfirmationTemplate } from "../booking-confirmation";

const baseData = {
  customerName: "Mario Rossi",
  confirmationCode: "ABC123",
  serviceName: "Social Boating",
  startDate: "15/08/2026",
  numPeople: 2,
  totalPrice: "300,00 EUR",
  paidAmount: "150,00 EUR",
  recoveryUrl: "https://egadisailing.com/it/recupera-prenotazione",
};

describe("bookingConfirmationTemplate", () => {
  it("includes the ticket URL in html and text when present", () => {
    const tpl = bookingConfirmationTemplate({
      ...baseData,
      ticketUrl: "https://egadisailing.com/it/ticket/ABC123",
    });

    expect(tpl.html).toContain("Biglietto QR");
    expect(tpl.html).toContain("https://egadisailing.com/it/ticket/ABC123");
    expect(tpl.html).toContain("Apri biglietto QR");
    expect(tpl.text).toContain("Biglietto QR: https://egadisailing.com/it/ticket/ABC123");
  });

  it("escapes customer data and rejects unsafe ticket URLs", () => {
    const tpl = bookingConfirmationTemplate({
      ...baseData,
      customerName: "<script>alert(1)</script>",
      ticketUrl: "javascript:alert(1)",
    });

    expect(tpl.html).not.toContain("<script>");
    expect(tpl.html).toContain("&amp;lt;script&amp;gt;");
    expect(tpl.html).not.toContain("javascript:");
    expect(tpl.html).not.toContain("Biglietto QR");
  });

  it.each([
    ["it", "Punto di incontro", "Presentati alle ore 9:00", "Apri in Google Maps"],
    ["en", "Meeting point", "Please arrive at 9:00 AM", "Open in Google Maps"],
    ["es", "Punto de encuentro", "Preséntate a las 9:00", "Abrir en Google Maps"],
    ["fr", "Point de rendez-vous", "Présentez-vous à 9 h 00", "Ouvrir dans Google Maps"],
    ["de", "Treffpunkt", "am Abreisetag um 9:00 Uhr", "In Google Maps öffnen"],
  ])(
    "includes localized meeting details for locale %s",
    (locale, meetingPoint, instructions, mapCta) => {
      const tpl = bookingConfirmationTemplate({
        ...baseData,
        locale,
      });

      for (const rendered of [tpl.html, tpl.text]) {
        expect(rendered).toContain(meetingPoint);
        expect(rendered).toContain("Marina Vento di Maestrale");
        expect(rendered).toContain(instructions);
        expect(rendered).toContain("Nicolò Genna");
        expect(rendered).toContain(mapCta);
        expect(rendered).toContain("https://maps.app.goo.gl/g1SYWfksRB7aExbm7");
      }
    },
  );
});
