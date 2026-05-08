import Decimal from "decimal.js";
import { NextResponse } from "next/server";
import { z } from "zod";
import type { DurationType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { addDays, eachUtcDayInclusive, isoDay, parseIsoDay, toUtcDay } from "@/lib/dates";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { getClientIp, normalizeIpForRateLimit } from "@/lib/http/client-ip";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { quotePrice } from "@/lib/pricing/service";
import { formatEurWithVat } from "@/lib/pricing/vat";
import { deriveEndDate } from "@/lib/booking/helpers";
import {
  decideBoatSlotAvailability,
  isBoatServiceType,
  loadBoatSlotAvailability,
  type BoatSlotService,
} from "@/lib/booking/boat-slot-availability";
import { checkOverrideEligibility } from "@/lib/booking/override-eligibility";
import { resolveExperienceServiceIdFromSlug } from "@/data/catalog/experiences";
import { isPublicBookingServiceEnabled } from "@/lib/services/public-booking";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  serviceId: z.string().min(1),
  start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  durationDays: z.coerce.number().int().min(3).max(7).optional(),
  locale: z.enum(["it", "en"]).optional(),
});

type CalendarStatus = "available" | "request" | "unavailable";

interface CalendarDay {
  date: string;
  status: CalendarStatus;
  selectable: boolean;
  priceLabel: string | null;
  priceHint: string | null;
  priceAmount: number | null;
  pricingUnit: string | null;
  spotsRemaining: number | null;
  reasonLabel: string | null;
}

interface CalendarService extends BoatSlotService {
  durationHours: number;
  pricingUnit: string | null;
}

function deriveCalendarEndDate(
  startDate: Date,
  service: Pick<CalendarService, "type" | "durationType" | "durationHours">,
  durationDays?: number,
): Date {
  if (service.type === "CABIN_CHARTER" && durationDays) {
    return addDays(startDate, durationDays - 1);
  }
  return toUtcDay(deriveEndDate(startDate, service.durationType, service.durationHours));
}

function reasonLabel(reason: string, locale?: string | null): string {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  switch (reason) {
    case "boat_block":
      return isEs ? "Bloqueada" : isFr ? "Bloquée" : isEn ? "Blocked" : "Bloccata";
    case "external_booking":
    case "full_day_priority":
      return isEs ? "Reservada" : isFr ? "Réservée" : isEn ? "Booked" : "Occupata";
    case "within_15_day_cutoff":
      return isEs ? "No reservable" : isFr ? "Non réservable" : isEn ? "Not bookable" : "Non prenotabile";
    case "insufficient_revenue":
      return isEs ? "Reservada" : isFr ? "Réservée" : isEn ? "Booked" : "Occupata";
    case "sold_out":
      return isEs ? "Agotada" : isFr ? "Complet" : isEn ? "Sold out" : "Esaurita";
    case "past":
      return isEs ? "Fecha pasada" : isFr ? "Date passée" : isEn ? "Past date" : "Passata";
    case "missing_price":
      return isEs ? "Precio no configurado" : isFr ? "Prix non configuré" : isEn ? "Price not configured" : "Prezzo non configurato";
    default:
      return isEs ? "No disponible" : isFr ? "Indisponible" : isEn ? "Unavailable" : "Non disponibile";
  }
}

function priceHintLabel(pricingUnit: string, locale?: string | null): string {
  if (pricingUnit === "PER_PACKAGE") {
    return locale === "es" ? "paquete" : locale === "fr" ? "forfait" : locale === "en" ? "package" : "pacchetto";
  }
  return locale === "es" ? "por persona" : locale === "fr" ? "par personne" : locale === "en" ? "per person" : "a persona";
}

async function evaluateCalendarDay(params: {
  service: CalendarService;
  date: Date;
  durationDays?: number;
  today: Date;
  locale?: string;
}): Promise<CalendarDay> {
  const { service, date, durationDays, today, locale } = params;
  const dateIso = isoDay(date);
  const endDate = deriveCalendarEndDate(date, service, durationDays);

  if (date.getTime() < today.getTime()) {
    return {
      date: dateIso,
      status: "unavailable",
      selectable: false,
      priceLabel: null,
      priceHint: null,
      priceAmount: null,
      pricingUnit: null,
      spotsRemaining: null,
      reasonLabel: reasonLabel("past", locale),
    };
  }

  let quote;
  try {
    quote = await quotePrice(service.id, date, 1, { durationDays });
  } catch {
    return {
      date: dateIso,
      status: "unavailable",
      selectable: false,
      priceLabel: null,
      priceHint: null,
      priceAmount: null,
      pricingUnit: null,
      spotsRemaining: null,
      reasonLabel: reasonLabel("missing_price", locale),
    };
  }

  const adminBlocks = await db.boatAvailability.findMany({
    where: {
      boatId: service.boatId,
      date: { gte: date, lte: endDate },
      status: "BLOCKED",
      lockedByBookingId: null,
    },
    select: { date: true },
  });

  const conflictingBookings: Array<{
    id: string;
    revenue: Decimal;
    isAdminBlock: boolean;
    source?: string;
    blockReason?: "full_day_priority";
  }> = adminBlocks.map((block) => ({
    id: `block:${isoDay(block.date)}`,
    revenue: new Decimal(0),
    isAdminBlock: true,
    source: "ADMIN_BLOCK",
  }));

  let spotsRemaining: number | null = service.capacityMax;
  if (isBoatServiceType(service.type) && isoDay(date) === isoDay(endDate)) {
    const slot = await loadBoatSlotAvailability(db, service.boatId, date);
    const decision = decideBoatSlotAvailability(service, 1, slot);
    spotsRemaining = service.type === "BOAT_SHARED" ? decision.sharedRemaining : 1;

    if (decision.capacityExceeded) {
      return {
        date: dateIso,
        status: "unavailable",
        selectable: false,
        priceLabel: formatEurWithVat(quote.totalPrice, locale),
        priceHint: priceHintLabel(quote.pricingUnit, locale),
        priceAmount: quote.totalPrice.toNumber(),
        pricingUnit: quote.pricingUnit,
        spotsRemaining: 0,
        reasonLabel: reasonLabel("sold_out", locale),
      };
    }

    for (const conflict of decision.conflicts) {
      conflictingBookings.push({
        id: conflict.booking.id,
        revenue: new Decimal(conflict.booking.totalPrice.toString()),
        isAdminBlock: false,
        source: conflict.booking.source,
        blockReason:
          service.durationType !== "FULL_DAY" &&
          conflict.booking.durationType === "FULL_DAY"
            ? "full_day_priority"
            : undefined,
      });
    }
  } else {
    const bookings = await db.booking.findMany({
      where: {
        boatId: service.boatId,
        status: { in: ["PENDING", "CONFIRMED"] },
        claimsAvailability: true,
        startDate: { lte: endDate },
        endDate: { gte: date },
      },
      select: { id: true, totalPrice: true, source: true },
    });
    for (const booking of bookings) {
      conflictingBookings.push({
        id: booking.id,
        revenue: new Decimal(booking.totalPrice.toString()),
        isAdminBlock: false,
        source: booking.source,
      });
    }
  }

  const result = checkOverrideEligibility({
    newBookingRevenue: new Decimal(quote.totalPrice.toString()),
    conflictingBookings,
    experienceDate: date,
    today: new Date(),
  });

  if (result.status === "normal") {
    return {
      date: dateIso,
      status: "available",
      selectable: true,
      priceLabel: formatEurWithVat(quote.totalPrice, locale),
      priceHint: priceHintLabel(quote.pricingUnit, locale),
      priceAmount: quote.totalPrice.toNumber(),
      pricingUnit: quote.pricingUnit,
      spotsRemaining,
      reasonLabel: locale === "es" ? "Disponible" : locale === "fr" ? "Disponible" : locale === "en" ? "Available" : "Libera",
    };
  }

  if (result.status === "override_request") {
    return {
      date: dateIso,
      status: "request",
      selectable: true,
      priceLabel: formatEurWithVat(quote.totalPrice, locale),
      priceHint: priceHintLabel(quote.pricingUnit, locale),
      priceAmount: quote.totalPrice.toNumber(),
      pricingUnit: quote.pricingUnit,
      spotsRemaining,
      reasonLabel: locale === "es" ? "Bajo petición" : locale === "fr" ? "Sur demande" : locale === "en" ? "On request" : "Su richiesta",
    };
  }

  return {
    date: dateIso,
    status: "unavailable",
    selectable: false,
    priceLabel: formatEurWithVat(quote.totalPrice, locale),
    priceHint: priceHintLabel(quote.pricingUnit, locale),
    priceAmount: quote.totalPrice.toNumber(),
    pricingUnit: quote.pricingUnit,
    spotsRemaining: null,
    reasonLabel: reasonLabel(result.reason, locale),
  };
}

export const GET = withErrorHandler(async (req: Request) => {
  const ip = normalizeIpForRateLimit(getClientIp(req.headers));
  await enforceRateLimit({
    identifier: ip,
    scope: RATE_LIMIT_SCOPES.BOOKING_CALENDAR_IP,
    limit: 120,
    windowSeconds: 60,
    failOpen: true,
  });

  const searchParams = Object.fromEntries(new URL(req.url).searchParams);
  const input = querySchema.parse(searchParams);
  const requestedServiceId = resolveExperienceServiceIdFromSlug(input.serviceId);
  if (!isPublicBookingServiceEnabled(requestedServiceId)) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Servizio non trovato" } },
      { status: 404 },
    );
  }
  const start = parseIsoDay(input.start);
  const end = parseIsoDay(input.end);
  const days = Array.from(eachUtcDayInclusive(start, end));

  if (days.length === 0 || days.length > 62) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Invalid calendar range" } },
      { status: 400 },
    );
  }

  const service = await db.service.findFirst({
    where: { id: requestedServiceId, active: true },
    select: {
      id: true,
      type: true,
      boatId: true,
      durationType: true,
      durationHours: true,
      capacityMax: true,
      pricingUnit: true,
    },
  });

  if (!service) {
    return NextResponse.json(
      { error: { code: "NOT_FOUND", message: "Servizio non trovato" } },
      { status: 404 },
    );
  }

  const today = toUtcDay(new Date());
  const calendarDays: CalendarDay[] = [];
  for (const day of days) {
    calendarDays.push(
      await evaluateCalendarDay({
        service: {
          ...service,
          durationType: service.durationType as DurationType,
        },
        date: day,
        durationDays: input.durationDays,
        today,
        locale: input.locale,
      }),
    );
  }

  return NextResponse.json(
    { data: { days: calendarDays } },
    { headers: { "cache-control": "no-store" } },
  );
});
