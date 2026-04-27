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
});
