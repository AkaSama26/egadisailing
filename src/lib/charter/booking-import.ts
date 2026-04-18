import { Prisma } from "@/generated/prisma/client";
import type { BookingStatus } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";
import { normalizeEmail } from "@/lib/email-normalize";
import { fromCents } from "@/lib/pricing/cents";
import { NotFoundError } from "@/lib/errors";
import { blockDates } from "@/lib/availability/service";
import { CHANNELS, type Channel } from "@/lib/channels";
import type {
  CharterPlatform,
  ExtractedCharterBooking,
} from "@/lib/email-parser/booking-extractor";

export interface ImportCharterInput extends ExtractedCharterBooking {
  platform: CharterPlatform;
  boatId: string;
}

export interface ImportedCharterBooking {
  bookingId: string;
  boatId: string;
  startDate: Date;
  endDate: Date;
  status: BookingStatus;
}

const PLATFORM_TO_CHANNEL: Record<CharterPlatform, Channel> = {
  SAMBOAT: CHANNELS.SAMBOAT,
  CLICKANDBOAT: CHANNELS.CLICKANDBOAT,
  NAUTAL: CHANNELS.NAUTAL,
};

/**
 * Importa un booking charter estratto da email. Idempotent su
 * `(platformName, platformBookingRef)`. Blocca availability via
 * `blockDates` POST-commit (fan-out verso altri canali).
 *
 * Cross-channel race detection: se trova un DIRECT PENDING/CONFIRMED
 * overlapping, log warn (admin review — la charter platform ha gia'
 * confermato upstream).
 *
 * @throws NotFoundError se `boatId` o nessun charter service trovato.
 */
export async function importCharterBooking(
  input: ImportCharterInput,
): Promise<ImportedCharterBooking> {
  const emailLower = normalizeEmail(input.customerEmail);

  const service = await db.service.findFirst({
    where: {
      boatId: input.boatId,
      type: { in: ["CABIN_CHARTER", "BOAT_EXCLUSIVE"] },
      active: true,
    },
    orderBy: { priority: "desc" },
  });
  if (!service) {
    throw new NotFoundError("Service", `charter service for boat=${input.boatId}`);
  }

  const totalPriceStr = fromCents(input.totalAmountCents).toFixed(2);

  try {
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.charterBooking.findUnique({
        where: {
          platformName_platformBookingRef: {
            platformName: input.platform,
            platformBookingRef: input.platformBookingRef,
          },
        },
        include: { booking: true },
      });

      if (existing) {
        logger.debug(
          { platform: input.platform, ref: input.platformBookingRef },
          "Charter booking already imported, skipping",
        );
        return {
          booking: {
            id: existing.bookingId,
            boatId: existing.booking.boatId,
            startDate: existing.booking.startDate,
            endDate: existing.booking.endDate,
            status: existing.booking.status,
          },
          mode: "skipped" as const,
        };
      }

      const customer = await tx.customer.upsert({
        where: { email: emailLower },
        update: {
          phone: input.customerPhone || undefined,
          nationality: input.customerNationality || undefined,
        },
        create: {
          email: emailLower,
          firstName: input.customerFirstName,
          lastName: input.customerLastName,
          phone: input.customerPhone,
          nationality: input.customerNationality,
        },
      });

      const overlappingDirect = await tx.booking.findFirst({
        where: {
          boatId: input.boatId,
          status: { in: ["PENDING", "CONFIRMED"] },
          source: "DIRECT",
          startDate: { lte: input.endDate },
          endDate: { gte: input.startDate },
        },
        select: { id: true, confirmationCode: true },
      });
      if (overlappingDirect) {
        logger.warn(
          {
            platform: input.platform,
            platformBookingRef: input.platformBookingRef,
            directBookingId: overlappingDirect.id,
            directCode: overlappingDirect.confirmationCode,
          },
          "Charter booking overlaps with active DIRECT booking — admin review needed",
        );
      }

      const created = await tx.booking.create({
        data: {
          confirmationCode: `${input.platform.slice(0, 2)}-${input.platformBookingRef}`,
          source: input.platform,
          externalRef: input.platformBookingRef,
          customerId: customer.id,
          serviceId: service.id,
          boatId: input.boatId,
          startDate: input.startDate,
          endDate: input.endDate,
          numPeople: 1,
          totalPrice: new Prisma.Decimal(totalPriceStr),
          currency: input.currency,
          status: "CONFIRMED",
          charterBooking: {
            create: {
              platformName: input.platform,
              platformBookingRef: input.platformBookingRef,
              // GDPR minimization: salviamo solo campi non-PII.
              rawPayload: {
                platform: input.platform,
                ref: input.platformBookingRef,
                subject: input.rawEmailSubject,
                startDate: input.startDate.toISOString().slice(0, 10),
                endDate: input.endDate.toISOString().slice(0, 10),
                totalAmountCents: input.totalAmountCents,
                currency: input.currency,
              } satisfies Prisma.InputJsonValue,
            },
          },
        },
        select: { id: true, boatId: true, startDate: true, endDate: true, status: true },
      });

      return { booking: created, mode: "created" as const };
    });

    // Fan-out availability POST-commit per evitare ghost jobs su rollback.
    if (result.mode === "created") {
      const channel = PLATFORM_TO_CHANNEL[input.platform];
      await blockDates(
        result.booking.boatId,
        result.booking.startDate,
        result.booking.endDate,
        channel,
        result.booking.id,
      );
    }

    logger.info(
      {
        bookingId: result.booking.id,
        platform: input.platform,
        ref: input.platformBookingRef,
        mode: result.mode,
      },
      `Charter booking ${result.mode}`,
    );
    return {
      bookingId: result.booking.id,
      boatId: result.booking.boatId,
      startDate: result.booking.startDate,
      endDate: result.booking.endDate,
      status: result.booking.status,
    };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      logger.warn(
        { platform: input.platform, ref: input.platformBookingRef },
        "Concurrent charter import race, retrying as lookup",
      );
      const row = await db.charterBooking.findUnique({
        where: {
          platformName_platformBookingRef: {
            platformName: input.platform,
            platformBookingRef: input.platformBookingRef,
          },
        },
        include: {
          booking: {
            select: { id: true, boatId: true, startDate: true, endDate: true, status: true },
          },
        },
      });
      if (!row) throw err;
      return {
        bookingId: row.booking.id,
        boatId: row.booking.boatId,
        startDate: row.booking.startDate,
        endDate: row.booking.endDate,
        status: row.booking.status,
      };
    }
    throw err;
  }
}
