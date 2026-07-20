import { z } from "zod";
import { ACCEPTED_POLICY_VERSIONS } from "@/lib/legal/policy-version";
import { emailSchema, freeTextSchema } from "@/lib/validation/common-zod";

export const contactFormSchema = z.object({
  locale: z.enum(["it", "en", "es", "fr", "de"]).default("it"),
  name: z.string().min(2).max(120).regex(/^[^<>]*$/, "Caratteri non ammessi"),
  email: emailSchema,
  phone: z.string().max(32).optional(),
  subject: freeTextSchema({ min: 3, max: 200 }),
  message: freeTextSchema({ min: 10, max: 5000 }),
  legalAccepted: z.literal("true"),
  policyVersion: z.enum(ACCEPTED_POLICY_VERSIONS),
  turnstileToken: z.string().optional(),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
