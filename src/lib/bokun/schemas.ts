import { z } from "zod";
import { toBokunRestBookingId } from "./booking-id";

const bokunWebhookEntityIdSchema = z.union([
  z.number().int().positive(),
  z
    .string()
    .min(1)
    .max(128)
    .regex(/^[A-Za-z0-9+/_=-]+$/, "Invalid Bokun entity ID format"),
]);

/**
 * Schema strict per gli ID ricevuti dal webhook Bokun. Accetta ID numerici e
 * global ID GraphQL base64/base64url (es. `Qm9va2luZzozNzY0OA`). La conversione
 * al formato REST numerico avviene in `toBokunRestBookingId` prima di costruire
 * qualsiasi path autenticato.
 */
export const bokunBookingIdSchema = bokunWebhookEntityIdSchema.refine(
  (value) => {
    try {
      toBokunRestBookingId(value);
      return true;
    } catch {
      return false;
    }
  },
  "Invalid Bokun bookingId format",
);

export const bokunExperienceBookingIdSchema = bokunWebhookEntityIdSchema;

export const bokunWebhookBodySchema = z.object({
  timestamp: z.string().optional(),
  bookingId: bokunBookingIdSchema.optional(),
  experienceBookingId: bokunExperienceBookingIdSchema.optional(),
});

/**
 * Validazione strict della response `getBokunBooking`. Il payload arriva da
 * un canale HMAC-verificato, ma proteggiamo comunque da payload Bokun
 * buggati o attacchi via SSRF/replay: `totalPrice` e `numPeople` devono
 * stare in range business-ragionevoli. Valori fuori range → import rejected
 * (meglio miss di un booking che scrivere dato spazzatura in DB).
 */
export const bokunBookingResponseSchema = z.object({
  id: z.number().int().positive(),
  confirmationCode: z.string().min(1).max(64),
  status: z.string().min(1).max(64),
  productId: z.string().min(1).max(64),
  productConfirmationCode: z.string().min(1).max(64),
  startDate: z.string().min(10),
  endDate: z.string().min(10).optional(),
  totalPrice: z.number().nonnegative().max(1_000_000),
  currency: z.string().length(3),
  channelName: z.string().max(128),
  mainContactDetails: z.object({
    firstName: z.string().max(128).default(""),
    lastName: z.string().max(128).default(""),
    email: z.string().email().max(256),
    phoneNumber: z.string().max(64).optional().nullable(),
    country: z.string().max(64).optional().nullable(),
    language: z.string().max(16).optional().nullable(),
  }),
  passengers: z
    .array(
      z.object({
        firstName: z.string().max(128).optional().nullable(),
        lastName: z.string().max(128).optional().nullable(),
        numPeople: z.number().int().nonnegative().max(100).optional(),
      }),
    )
    .optional(),
  // Bokun alcuni booking legacy/gift-voucher hanno numPeople: 0 (carrier vuoto).
  // Accettiamo e facciamo fallback a 1 al momento dell'insert DB — rifiutare
  // qui vorrebbe dire webhook 500 + retry loop Bokun.
  numPeople: z.number().int().min(0).max(100).optional(),
  paymentStatus: z.string().max(64).optional(),
  supplierPrice: z.number().nonnegative().max(1_000_000).optional().nullable(),
  commissionPercent: z.number().nonnegative().max(100).optional().nullable(),
  commissionAmount: z.number().nonnegative().max(1_000_000).optional().nullable(),
  netAmount: z.number().nonnegative().max(1_000_000).optional().nullable(),
  experienceBookings: z.array(z.unknown()).optional(),
  productBookings: z.array(z.unknown()).optional(),
});

export type BokunBookingResponse = z.infer<typeof bokunBookingResponseSchema>;
