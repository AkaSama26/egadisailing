import { bokunClient } from "./index";
import { bokunBookingResponseSchema } from "./schemas";
import { logger } from "@/lib/logger";
import type { BokunBookingSummary } from "./types";
import { toBokunRestBookingId } from "./booking-id";

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

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function moneyAmount(value: unknown): number | undefined {
  const record = getRecord(value);
  return numberValue(record?.amount) ?? numberValue(value);
}

function sumPaymentAmounts(payments: unknown[] | undefined): number | undefined {
  if (!payments) return undefined;
  let total = 0;
  let hasAmount = false;
  for (const payment of payments) {
    const record = getRecord(payment);
    const amount = moneyAmount(record?.amountAsMoney) ?? numberValue(record?.amount);
    if (amount !== undefined && amount > 0) {
      total += amount;
      hasAmount = true;
    }
  }
  return hasAmount ? roundMoney(total) : undefined;
}

function maxPositive(values: Array<number | undefined>): number | undefined {
  const positives = values.filter((value): value is number => value !== undefined && value > 0);
  if (positives.length === 0) return undefined;
  return roundMoney(Math.max(...positives));
}

function getSellerCommissionPercent(child: AnyRecord | undefined): number | undefined {
  const sellerInvoice = getRecord(child?.sellerInvoice);
  const lineItem = getRecord(getArray(sellerInvoice?.lineItems)?.[0]);
  return numberValue(lineItem?.commission);
}

function deriveCommissionAmount(
  retailPrice: number,
  commissionPercent: number | undefined,
  explicitCommissionAmount: number | undefined,
): number | undefined {
  if (explicitCommissionAmount !== undefined) return roundMoney(explicitCommissionAmount);
  if (commissionPercent === undefined) return undefined;
  return roundMoney(retailPrice * (commissionPercent / 100));
}

function deriveNetAmount(
  retailPrice: number,
  commissionAmount: number | undefined,
  explicitNetAmount: number | undefined,
): number | undefined {
  if (explicitNetAmount !== undefined) return roundMoney(explicitNetAmount);
  if (commissionAmount === undefined) return undefined;
  return roundMoney(retailPrice - commissionAmount);
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
  const supplierPrice = numberValue(child?.totalPrice ?? child?.priceWithDiscount ?? raw.totalPrice);
  const searchFallbackPrice = numberValue(child?.totalPrice ?? child?.priceWithDiscount ?? raw.totalPrice);
  const customerPaid = sumPaymentAmounts(getArray(raw.customerPayments));
  const totalPrice = maxPositive([customerPaid, numberValue(raw.totalPaid), supplierPrice]) ?? searchFallbackPrice;
  const currency = stringValue(raw.currency ?? child?.currency);
  const channelName = getChannelName(raw, child);
  const commissionPercent = getSellerCommissionPercent(child);
  const commissionAmount = deriveCommissionAmount(
    totalPrice ?? 0,
    commissionPercent,
    numberValue(raw.commissionAmount ?? child?.commissionAmount),
  );
  const netAmount = deriveNetAmount(
    totalPrice ?? 0,
    commissionAmount,
    numberValue(raw.netAmount ?? child?.netAmount),
  );

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
    paymentStatus: stringValue(raw.paymentStatus ?? child?.paymentStatus ?? raw.paymentType ?? child?.paidType),
    supplierPrice,
    commissionPercent,
    commissionAmount,
    netAmount,
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
 * Recupera il dettaglio da un ID REST numerico o dal global ID GraphQL del
 * webhook; la conversione strict precede la costruzione del path autenticato.
 */
export async function getBokunBooking(bookingId: string | number): Promise<BokunBookingSummary> {
  const safeId = encodeURIComponent(toBokunRestBookingId(bookingId));
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
