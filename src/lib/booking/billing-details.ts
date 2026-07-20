import { z } from "zod";

const noHtmlText = (max: number) =>
  z.string().trim().max(max).regex(/^[^<>]*$/, "Caratteri non validi");

export const isoCountryCodeSchema = z
  .string()
  .trim()
  .transform((value) => value.toUpperCase())
  .pipe(z.string().regex(/^[A-Z]{2}$/, "Codice Paese non valido"));

/**
 * Dati anagrafici di fatturazione per un cliente privato.
 *
 * Il codice fiscale italiano e la provincia sono obbligatori solo quando
 * l'indirizzo di fatturazione e' in Italia. Per gli altri Paesi il tax ID
 * locale e la regione restano facoltativi: non tutti gli Stati assegnano ai
 * privati un identificativo fiscale utilizzabile in fattura.
 */
export const privateBillingDetailsSchema = z
  .object({
    taxId: noHtmlText(64).optional().default(""),
    addressLine1: noHtmlText(200).min(2, "Indirizzo obbligatorio"),
    addressLine2: noHtmlText(200).optional().default(""),
    city: noHtmlText(100).min(1, "Citta obbligatoria"),
    province: noHtmlText(100).optional().default(""),
    postalCode: noHtmlText(20).min(1, "CAP o codice postale obbligatorio"),
    countryCode: isoCountryCodeSchema,
  })
  .superRefine((value, ctx) => {
    if (value.countryCode !== "IT") return;

    if (!/^[A-Za-z0-9]{16}$/.test(value.taxId)) {
      ctx.addIssue({
        code: "custom",
        path: ["taxId"],
        message: "Il Codice Fiscale italiano deve contenere 16 caratteri",
      });
    }
    if (!value.province) {
      ctx.addIssue({
        code: "custom",
        path: ["province"],
        message: "Provincia obbligatoria per un indirizzo italiano",
      });
    }
  })
  .transform((value) => ({
    ...value,
    taxId: value.countryCode === "IT" ? value.taxId.toUpperCase() : value.taxId,
  }));

export type PrivateBillingDetails = z.infer<typeof privateBillingDetailsSchema>;
