import { describe, expect, it } from "vitest";
import { privateBillingDetailsSchema } from "./billing-details";

const italianDetails = {
  taxId: "rssmra80a01h501u",
  addressLine1: "Via Roma 1",
  addressLine2: "",
  city: "Roma",
  province: "RM",
  postalCode: "00100",
  countryCode: "it",
};

describe("privateBillingDetailsSchema", () => {
  it("normalizza Paese e Codice Fiscale italiani", () => {
    expect(privateBillingDetailsSchema.parse(italianDetails)).toMatchObject({
      countryCode: "IT",
      taxId: "RSSMRA80A01H501U",
    });
  });

  it("richiede Codice Fiscale e provincia per l'Italia", () => {
    expect(
      privateBillingDetailsSchema.safeParse({
        ...italianDetails,
        taxId: "",
        province: "",
      }).success,
    ).toBe(false);
  });

  it("accetta un privato estero senza identificativo fiscale o regione", () => {
    expect(
      privateBillingDetailsSchema.safeParse({
        addressLine1: "10 Downing Street",
        city: "London",
        postalCode: "SW1A 2AA",
        countryCode: "GB",
      }).success,
    ).toBe(true);
  });
});
