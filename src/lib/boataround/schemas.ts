import { z } from "zod";

/**
 * Boataround `bookingId` safe per path-interpolation. Stessa difesa contro
 * SSRF/path-traversal del finding Round 7 sul Bokun.
 */
export const boataroundBookingIdSchema = z
  .string()
  .regex(/^[A-Za-z0-9_-]{1,64}$/, "Invalid Boataround bookingId format");

export const boataroundWebhookBodySchema = z.object({
  type: z.string().min(1).max(64),
  bookingId: boataroundBookingIdSchema,
  timestamp: z.string().optional(),
});

export const boataroundBookingResponseSchema = z.object({
  id: z.string().min(1).max(64),
  boatId: z.string().min(1).max(128),
  startDate: z.string().min(10),
  endDate: z.string().min(10),
  totalPrice: z.number().nonnegative().max(1_000_000),
  currency: z.string().length(3),
  status: z.string().min(1).max(64),
  customer: z.object({
    firstName: z.string().max(128).default(""),
    lastName: z.string().max(128).default(""),
    email: z.string().email().max(256),
    phone: z.string().max(64).optional().nullable(),
    country: z.string().max(64).optional().nullable(),
  }),
});

export type BoataroundBookingResponse = z.infer<typeof boataroundBookingResponseSchema>;
