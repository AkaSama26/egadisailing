import { z } from "zod";

/**
 * Schema strict per `bookingId` usato come segmento path della Bokun API.
 * Accetta solo numeri interi positivi o codici alfanumerici (no `/`, `.`,
 * `..`, nessun carattere URL-reserved). Previene SSRF/path-traversal su
 * endpoint del tipo `/booking.json/booking/${bookingId}`.
 */
export const bokunBookingIdSchema = z.union([
  z.number().int().positive(),
  z.string().regex(/^[A-Za-z0-9_-]{1,64}$/, "Invalid Bokun bookingId format"),
]);

export const bokunWebhookBodySchema = z.object({
  timestamp: z.string().optional(),
  bookingId: bokunBookingIdSchema,
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
  numPeople: z.number().int().min(1).max(100).optional(),
  paymentStatus: z.string().max(64).optional(),
  commissionAmount: z.number().nonnegative().max(1_000_000).optional().nullable(),
  netAmount: z.number().nonnegative().max(1_000_000).optional().nullable(),
});

export type BokunBookingResponse = z.infer<typeof bokunBookingResponseSchema>;
