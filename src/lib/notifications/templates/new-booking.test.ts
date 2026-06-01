import { describe, expect, it } from "vitest";
import { newBookingTemplate } from "./new-booking";

const basePayload = {
  source: "DIRECT",
  confirmationCode: "ABC123",
  customerName: "Mario Rossi",
  serviceName: "Tour privato 8 ore",
  startDate: "2026-08-15",
  numPeople: 4,
  totalPrice: "€400,00",
  paymentType: "Acconto",
  paidAmount: "€150,00",
  balanceAmount: "€250,00",
};

describe("newBookingTemplate", () => {
  it("renders the admin booking payment summary in html, text and telegram", () => {
    const tpl = newBookingTemplate(basePayload);

    expect(tpl.subject).toContain("Nuova prenotazione DIRECT · ABC123");
    expect(tpl.html).toContain("Numero prenotazione");
    expect(tpl.html).toContain("Tipo prenotazione");
    expect(tpl.html).toContain("Costo prenotazione");
    expect(tpl.html).toContain("Tipo pagamento");
    expect(tpl.html).toContain("Pagato");
    expect(tpl.html).toContain("Rimanente da pagare");
    expect(tpl.html).toContain("Acconto");
    expect(tpl.html).toContain("€250,00");

    expect(tpl.text).toContain("Numero prenotazione: ABC123");
    expect(tpl.text).toContain("Tipo pagamento: Acconto");
    expect(tpl.text).toContain("Pagato: €150,00");
    expect(tpl.text).toContain("Rimanente da pagare: €250,00");

    expect(tpl.telegram).toContain("Pagato: Acconto · €150,00");
    expect(tpl.telegram).toContain("Saldo: €250,00");
  });

  it("escapes html and keeps plain text values single-line", () => {
    const tpl = newBookingTemplate({
      ...basePayload,
      customerName: "<script>alert(1)</script>",
      serviceName: "Tour\nInjected",
    });

    expect(tpl.html).not.toContain("<script>");
    expect(tpl.html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(tpl.text).toContain("Tipo prenotazione: Tour Injected");
  });
});
