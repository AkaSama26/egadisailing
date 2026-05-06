import { describe, expect, it } from "vitest";
import { otpEmailTemplate } from "../otp";

describe("otpEmailTemplate", () => {
  it("renders recovery context and management actions", () => {
    const tpl = otpEmailTemplate("123456");

    expect(tpl.subject).toContain("recuperare la prenotazione");
    expect(tpl.html).toContain("123456");
    expect(tpl.html).toContain("biglietto QR");
    expect(tpl.html).toContain("richiedere cambio data");
    expect(tpl.html).toContain("rimborso");
    expect(tpl.text).toContain("123456");
    expect(tpl.text).toContain("richiedere cambio data");
  });

  it("escapes the code before rendering html", () => {
    const tpl = otpEmailTemplate("<script>");

    expect(tpl.html).not.toContain("<script>");
    expect(tpl.html).toContain("&lt;script&gt;");
  });
});
