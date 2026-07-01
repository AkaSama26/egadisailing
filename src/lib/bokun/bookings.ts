import { bokunClient } from "./index";
import { bokunBookingResponseSchema } from "./schemas";
import { logger } from "@/lib/logger";
import type { BokunBookingSummary } from "./types";

type AnyRecord = Record<string, unknown>;

function isRecord(value: unknown): value is AnyRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getRecord(value: unknown): AnyRecord | undefined {
  return isRecord(value) ? value : undefined;
}

function getArray(value: unknown): unknown[] | undefined {
  return Array.isArray(value) ? value : undefined;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return undefined;
}

function numberValue(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function integerValue(value: unknown): number | undefined {
  const parsed = numberValue(value);
  return parsed === undefined ? undefined : Math.trunc(parsed);
}

function dateOnly(value: unknown): string | undefined {
  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString().slice(0, 10);
  }
  if (typeof value === "string" && value.trim()) {
    const raw = value.trim();
    if (/^\d{13}$/.test(raw)) return new Date(Number(raw)).toISOString().slice(0, 10);
    if (raw.length >= 10) return raw.slice(0, 10);
  }
  return undefined;
}

function nestedString(record: AnyRecord | undefined, key: string): string | undefined {
  return record ? stringValue(record[key]) : undefined;
}

function firstRecord(values: Array<unknown | undefined>): AnyRecord | undefined {
  for (const value of values) {
    if (isRecord(value)) return value;
  }
  return undefined;
}

function getBookingChildren(raw: AnyRecord): unknown[] {
  return (
    getArray(raw.productBookings) ??
    getArray(raw.activityBookings) ??
    getArray(raw.experienceBookings) ??
    []
  );
}

function getProductId(child: AnyRecord | undefined, raw: AnyRecord): string | undefined {
  const product = getRecord(child?.product) ?? getRecord(child?.bookable) ?? getRecord(child?.experience);
  return stringValue(child?.productId) ?? stringValue(product?.id) ?? stringValue(raw.productId);
}

function getChannelName(raw: AnyRecord, child: AnyRecord | undefined): string | undefined {
  const rawChannel = firstRecord([raw.channel, raw.bookingChannel]);
  const childChannel = firstRecord([child?.channel, child?.bookingChannel]);
  return (
    nestedString(rawChannel, "title") ??
    nestedString(rawChannel, "name") ??
    nestedString(childChannel, "title") ??
    nestedString(childChannel, "name") ??
    stringValue(raw.channelName)
  );
}

function normalizeCustomer(raw: AnyRecord, child: AnyRecord | undefined, fallbackId: number) {
  const customer = firstRecord([raw.mainContactDetails, raw.customer, child?.customer]);
  const email =
    nestedString(customer, "email") ??
    nestedString(customer, "clcEmail") ??
    `bokun-${fallbackId}@unknown.egadisailing.invalid`;
  return {
    firstName: nestedString(customer, "firstName") ?? "",
    lastName: nestedString(customer, "lastName") ?? "",
    email,
    phoneNumber: nestedString(customer, "phoneNumber"),
    country: nestedString(customer, "country") ?? nestedString(customer, "nationality"),
    language: nestedString(customer, "language") ?? stringValue(raw.language),
  };
}

/**
 * Bokun espone due shape diversi:
 * - legacy/adapter-ready: campi flat (`id`, `productId`, `startDate`, ...)
 * - booking-search/current detail: parent booking con `items`/`activityBookings`
 *
 * Normalizziamo entrambi al subset usato dall'import DB, senza PII extra.
 */
export function normalizeBokunBookingResponse(raw: unknown): BokunBookingSummary | null {
  const parsed = bokunBookingResponseSchema.safeParse(raw);
  if (parsed.success) return parsed.data;
  if (!isRecord(raw)) return null;

  const children = getBookingChildren(raw);
  const child = getRecord(children[0]);
  const id = integerValue(raw.id) ?? integerValue(raw.bookingId) ?? integerValue(child?.parentBookingId);
  if (!id) return null;

  const productId = getProductId(child, raw);
  const confirmationCode = stringValue(raw.confirmationCode) ?? stringValue(child?.confirmationCode);
  const productConfirmationCode =
    stringValue(child?.productConfirmationCode) ??
    stringValue(child?.confirmationCode) ??
    stringValue(raw.productConfirmationCode) ??
    confirmationCode;
  const startDate = dateOnly(child?.startDate ?? child?.startDateTime ?? child?.date ?? raw.startDate);
  const endDate = dateOnly(child?.endDate ?? child?.endDateTime ?? child?.date ?? raw.endDate) ?? startDate;
  const status = stringValue(child?.status) ?? stringValue(raw.status);
  const totalPrice = numberValue(child?.totalPrice ?? child?.priceWithDiscount ?? raw.totalPrice);
  const currency = stringValue(raw.currency ?? child?.currency);
  const channelName = getChannelName(raw, child);

  if (!productId || !confirmationCode || !productConfirmationCode || !startDate || !status || totalPrice === undefined || !currency || !channelName) {
    return null;
  }

  const normalized = {
    id,
    confirmationCode,
    status,
    productId,
    productConfirmationCode,
    startDate,
    endDate,
    totalPrice,
    currency,
    channelName,
    mainContactDetails: normalizeCustomer(raw, child, id),
    passengers: getArray(raw.passengers) as BokunBookingSummary["passengers"],
    numPeople: integerValue(child?.numPeople ?? child?.totalParticipants ?? raw.numPeople),
    paymentStatus: stringValue(raw.paymentStatus ?? child?.paymentStatus ?? raw.paymentType),
    commissionAmount: numberValue(raw.commissionAmount),
    netAmount: numberValue(raw.netAmount),
    experienceBookings: getArray(raw.experienceBookings ?? raw.activityBookings),
    productBookings: getArray(raw.productBookings ?? raw.activityBookings),
  };

  const normalizedParsed = bokunBookingResponseSchema.safeParse(normalized);
  if (normalizedParsed.success) return normalizedParsed.data;

  logger.warn(
    {
      bokunBookingId: id,
      issues: normalizedParsed.error.issues.slice(0, 3),
    },
    "Dropped malformed normalized Bokun booking",
  );
  return null;
}

function getSearchItems(raw: unknown): unknown[] {
  if (!isRecord(raw)) return [];
  return getArray(raw.bookings) ?? getArray(raw.items) ?? [];
}

function getTotalHits(raw: unknown, fallback: number): number {
  if (!isRecord(raw)) return fallback;
  return integerValue(raw.totalHits) ?? fallback;
}

/**
 * Fetch single booking by Bokun confirmation code.
 *
 * `bookingId` DEVE essere gia' validato con `bokunBookingIdSchema` prima di
 * essere passato qui — ma facciamo comunque `encodeURIComponent` come
 * defense-in-depth per prevenire SSRF/path-traversal verso altri endpoint
 * Bokun authenticati.
 */
export async function getBokunBooking(bookingId: string | number): Promise<BokunBookingSummary> {
  const safeId = encodeURIComponent(String(bookingId));
  const raw = await bokunClient().request<unknown>(
    "GET",
    `/booking.json/booking/${safeId}`,
  );
  const normalized = normalizeBokunBookingResponse(raw);
  if (!normalized) return bokunBookingResponseSchema.parse(raw);
  return normalized;
}

export interface SearchParams {
  startDate?: string;
  endDate?: string;
  updatedSince?: string;
  page?: number;
  pageSize?: number;
}

export interface SearchResult {
  bookings: BokunBookingSummary[];
  totalHits: number;
}

/**
 * Search bookings — usato dal cron di reconciliation come fallback per
 * webhook persi. `updatedSince` e' l'unico filtro affidabile per incremental.
 *
 * Ogni booking nel result e' validato individualmente; quelli che non passano
 * vengono droppati con warning (non vogliamo che un booking malformato
 * blocchi l'intera run).
 */
export async function searchBokunBookings(params: SearchParams): Promise<SearchResult> {
  const raw = await bokunClient().request<unknown>(
    "POST",
    "/booking.json/booking-search",
    params,
  );
  const bookings: BokunBookingSummary[] = [];
  for (const item of getSearchItems(raw)) {
    const normalized = normalizeBokunBookingResponse(item);
    if (normalized) {
      bookings.push(normalized);
    } else {
      const anyB = item as { id?: unknown; bookingId?: unknown; confirmationCode?: unknown };
      logger.warn(
        {
          bokunBookingId: anyB?.id ?? anyB?.bookingId,
          confirmationCode: anyB?.confirmationCode,
        },
        "Dropped malformed Bokun booking from search result",
      );
    }
  }
  return { bookings, totalHits: getTotalHits(raw, bookings.length) };
}
