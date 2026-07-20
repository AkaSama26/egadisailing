import { describe, expect, it } from "vitest";
import { CURRENT_POLICY_VERSION } from "@/lib/legal/policy-version";
import { contactFormSchema } from "@/lib/contact-form";

const validInput = {
  locale: "it",
  name: "Mario Rossi",
  email: "mario@example.com",
  subject: "Informazioni",
  message: "Vorrei maggiori informazioni.",
  legalAccepted: "true",
  policyVersion: CURRENT_POLICY_VERSION,
};

describe("contactFormSchema", () => {
  it("accetta il form quando privacy e termini sono stati accettati", () => {
    expect(contactFormSchema.safeParse(validInput).success).toBe(true);
  });

  it("rifiuta il form quando manca l'accettazione obbligatoria", () => {
    expect(
      contactFormSchema.safeParse({ ...validInput, legalAccepted: undefined }).success,
    ).toBe(false);
  });

  it("rifiuta un valore manomesso dell'accettazione", () => {
    expect(contactFormSchema.safeParse({ ...validInput, legalAccepted: "false" }).success).toBe(
      false,
    );
  });
});
