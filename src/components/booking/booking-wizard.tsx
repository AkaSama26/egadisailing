"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Baby, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CreditCard, ReceiptText, UserRound, Users } from "lucide-react";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { StripePaymentForm } from "./stripe-payment-form";
import { CountryFlag, type FlagCode } from "@/components/country-flag";
import { TurnstileWidget } from "@/components/turnstile/turnstile-widget";
import { CustomerWeatherCard } from "@/components/weather/customer-weather-card";
import { CURRENT_POLICY_VERSION } from "@/lib/legal/policy-version";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import { checkOverrideEligibilityAction } from "@/lib/booking/override-check-action";
import type { PublicWeatherSummary } from "@/lib/weather/public-format";
import {
  DEFAULT_PASSENGER_FARE_RULES,
  estimatePaidUnitEquivalent,
  estimatePassengerFareTotal,
  normalizePassengerFareRules,
  occupiedSeatCountForRules,
  sanitizePassengerBreakdownForRules,
  totalGuestCountFromBreakdown,
  type PassengerFareCategory,
  type PassengerFareRuleConfig,
} from "@/lib/pricing/passenger-fare-rules-shared";

type Step = "date" | "people" | "customer" | "review" | "payment" | "success";
type CheckoutPaymentSchedule = "FULL" | "DEPOSIT_BALANCE";

const CHECKOUT_STEPS: Array<{
  key: Exclude<Step, "success">;
  label: string;
  icon: typeof CalendarDays;
}> = [
  { key: "date", label: "Date", icon: CalendarDays },
  { key: "people", label: "Ospiti", icon: Users },
  { key: "customer", label: "Dati", icon: UserRound },
  { key: "review", label: "Riepilogo", icon: ReceiptText },
  { key: "payment", label: "Pagamento", icon: CreditCard },
];

const CHECKOUT_STEPS_EN: typeof CHECKOUT_STEPS = [
  { key: "date", label: "Date", icon: CalendarDays },
  { key: "people", label: "Guests", icon: Users },
  { key: "customer", label: "Details", icon: UserRound },
  { key: "review", label: "Summary", icon: ReceiptText },
  { key: "payment", label: "Payment", icon: CreditCard },
];

const CHECKOUT_STEPS_ES: typeof CHECKOUT_STEPS = [
  { key: "date", label: "Fecha", icon: CalendarDays },
  { key: "people", label: "Huéspedes", icon: Users },
  { key: "customer", label: "Datos", icon: UserRound },
  { key: "review", label: "Resumen", icon: ReceiptText },
  { key: "payment", label: "Pago", icon: CreditCard },
];

const CHECKOUT_STEPS_FR: typeof CHECKOUT_STEPS = [
  { key: "date", label: "Date", icon: CalendarDays },
  { key: "people", label: "Invités", icon: Users },
  { key: "customer", label: "Coordonnées", icon: UserRound },
  { key: "review", label: "Résumé", icon: ReceiptText },
  { key: "payment", label: "Paiement", icon: CreditCard },
];

function clientIntlLocale(locale?: string | null): string {
  if (locale === "es") return "es-ES";
  if (locale === "fr") return "fr-FR";
  if (locale === "en") return "en-GB";
  return "it-IT";
}

// R26-A1-C1: sessionStorage persistence per evitare conversion loss su tab-kill
// (iOS Safari sospende background tab ~30s), refresh accidentale, navigazione
// back/forward. Chiavi derivate dal serviceId per supportare wizard aperti
// contemporaneamente su servizi diversi. Escludiamo clientSecret (Stripe PI
// single-use), turnstileToken (expiry 5min), consent (legal: l'utente deve
// reaccettare se ricarica) — persistiamo SOLO dati "innocui" input.
interface PersistedState {
  step: Step;
  startDate: string;
  endDate: string;
  durationDays: number;
  numPeople?: number;
  passengers?: PassengerBreakdown;
  paymentSchedule?: CheckoutPaymentSchedule;
  customer: Customer;
}

function storageKey(serviceId: string): string {
  return `wizard-draft:${serviceId}`;
}

function loadDraft(serviceId: string): Partial<PersistedState> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(serviceId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (typeof parsed !== "object" || !parsed) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveDraft(serviceId: string, data: PersistedState): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(storageKey(serviceId), JSON.stringify(data));
  } catch {
    /* storage full / disabled */
  }
}

function clearDraft(serviceId: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(storageKey(serviceId));
  } catch {
    /* ignore */
  }
}

function bookingSuccessPath(locale: string, confirmationCode: string): string {
  const code = encodeURIComponent(confirmationCode);
  if (locale === "es") return `/es/reservar/confirmacion/${code}`;
  if (locale === "fr") return `/fr/reserver/confirmation/${code}`;
  return `/${locale}/prenota/success/${code}`;
}

function addIsoDays(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function isoFromUtcParts(year: number, monthIndex: number, day: number): string {
  return new Date(Date.UTC(year, monthIndex, day)).toISOString().slice(0, 10);
}

function monthKeyFromIso(isoDate: string): string {
  return isoDate.slice(0, 7);
}

function monthLabel(monthIso: string, locale?: string | null): string {
  const date = new Date(`${monthIso}-01T00:00:00.000Z`);
  return new Intl.DateTimeFormat(clientIntlLocale(locale), {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function shiftMonth(monthIso: string, offset: number): string {
  const [year, month] = monthIso.split("-").map(Number);
  return isoFromUtcParts(year, month - 1 + offset, 1).slice(0, 7);
}

function calendarRange(monthIso: string): { start: string; end: string; days: string[] } {
  const [year, month] = monthIso.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1, 1));
  const gridStart = new Date(first);
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  gridStart.setUTCDate(first.getUTCDate() - mondayOffset);

  const days: string[] = [];
  for (let i = 0; i < 42; i += 1) {
    const day = new Date(gridStart);
    day.setUTCDate(gridStart.getUTCDate() + i);
    days.push(day.toISOString().slice(0, 10));
  }
  return { start: days[0], end: days[days.length - 1], days };
}

function inclusiveDaysBetween(startDate: string, endDate: string): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(`${startDate}T00:00:00.000Z`).getTime();
  const end = new Date(`${endDate}T00:00:00.000Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / 86_400_000) + 1;
}

function deriveClientEndDate(
  startDate: string,
  durationType: string,
  durationHours: number,
  durationDays?: number,
): string {
  if (!startDate) return startDate;
  if (durationType === "MULTI_DAY") {
    return addIsoDays(startDate, Math.max(1, durationDays ?? Math.ceil(durationHours / 24)) - 1);
  }
  if (durationType === "WEEK") return addIsoDays(startDate, 6);
  return startDate;
}

interface Props {
  locale: string;
  serviceId: string;
  serviceName: string;
  serviceType: string;
  durationType: string;
  durationHours: number;
  capacityMax: number;
  defaultPaymentSchedule: "FULL" | "DEPOSIT_BALANCE";
  defaultDepositPercentage: number | null;
  turnstileSiteKey: string;
  useStripeCheckout: boolean;
  /** R26-A1-A4: canonical APP_URL server-side per Stripe return_url.
   *  `window.location.origin` sarebbe l'host del request — se l'utente
   *  arriva via IP staging o host non-canonical (misconfig Caddy), Stripe
   *  ritornerebbe a quell'host che poi potrebbe non matchare
   *  SERVER_ACTIONS_ALLOWED_ORIGINS. */
  appUrl: string;
  initialStartDate?: string;
  initialEndDate?: string;
  initialDurationDays?: number;
  fixedDurationDays?: number;
  passengerFareRules?: PassengerFareRuleConfig[];
}

interface Customer {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  nationality: string;
  language: string;
}

type PhoneCountry = {
  code: CountryCode;
  flagCode: FlagCode;
  dialCode: string;
  label: string;
  searchLabel: string;
};

type PhoneCountryDropdownPosition = {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
};

const PHONE_COUNTRY_DROPDOWN_WIDTH = 176;
const PHONE_COUNTRY_DROPDOWN_SEARCH_HEIGHT = 53;

const phoneCountryDisplayNames = new Intl.DisplayNames(["it", "en"], { type: "region" });

const PHONE_COUNTRIES: PhoneCountry[] = getCountries()
  .map((code) => {
    const label = phoneCountryDisplayNames.of(code) ?? code;
    const dialCode = `+${getCountryCallingCode(code)}`;
    return {
      code,
      flagCode: code,
      dialCode,
      label,
      searchLabel: `${code} ${label} ${dialCode}`.toLocaleLowerCase("it-IT"),
    };
  })
  .sort((a, b) => {
    const byDialCode = Number(a.dialCode.slice(1)) - Number(b.dialCode.slice(1));
    if (byDialCode !== 0) return byDialCode;
    return a.label.localeCompare(b.label, "it");
  });

function defaultPhoneCountryCode(locale: string): CountryCode {
  return locale === "es" ? "ES" : locale === "fr" ? "FR" : locale === "en" ? "GB" : "IT";
}

function countryByCode(code: string): PhoneCountry {
  return PHONE_COUNTRIES.find((country) => country.code === code) ?? PHONE_COUNTRIES[0];
}

function countryFromPhone(phone: string): PhoneCountry | undefined {
  const trimmed = phone.trim();
  return [...PHONE_COUNTRIES]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((country) => trimmed.startsWith(country.dialCode));
}

function selectedPhoneCountry(phone: string, locale: string): PhoneCountry {
  return countryFromPhone(phone) ?? countryByCode(defaultPhoneCountryCode(locale));
}

function stripDialCode(phone: string, country: PhoneCountry) {
  const trimmed = phone.trim();
  if (trimmed.startsWith(country.dialCode)) {
    return trimmed.slice(country.dialCode.length).trimStart();
  }
  return trimmed.replace(/^\+\d{1,4}\s*/, "");
}

function composePhone(dialCode: string, nationalNumber: string) {
  const normalized = nationalNumber.trim().replace(/^\+\d{1,4}\s*/, "");
  return normalized ? `${dialCode} ${normalized}` : dialCode;
}

function hasNationalPhoneNumber(phone: string, locale: string) {
  const country = selectedPhoneCountry(phone, locale);
  return /\d/.test(stripDialCode(phone, country));
}

interface PassengerBreakdown {
  adults: number;
  children: number;
  freeChildren: number;
  infants: number;
}

const PASSENGER_CATEGORY_FIELD: Record<PassengerFareCategory, keyof PassengerBreakdown> = {
  ADULT: "adults",
  CHILD: "children",
  FREE_CHILD: "freeChildren",
  INFANT: "infants",
};

interface SelectedPrice {
  amount: number;
  pricingUnit: string;
}

function defaultPassengers(): PassengerBreakdown {
  return { adults: 1, children: 0, freeChildren: 0, infants: 0 };
}

function occupiedSeats(
  passengers: PassengerBreakdown,
  fareRules: PassengerFareRuleConfig[] = DEFAULT_PASSENGER_FARE_RULES,
): number {
  return occupiedSeatCountForRules(passengers, fareRules);
}

function paidUnitsForClient(
  serviceType: string,
  passengers: PassengerBreakdown,
  selectedPrice: SelectedPrice | null,
  fareRules: PassengerFareRuleConfig[] = DEFAULT_PASSENGER_FARE_RULES,
): number {
  return estimatePaidUnitEquivalent({
    serviceType,
    pricingUnit: selectedPrice?.pricingUnit ?? "PER_PERSON",
    unitPrice: selectedPrice?.amount ?? 1,
    passengers,
    rules: fareRules,
  });
}

function formatClientEur(amount: number, locale?: string | null): string {
  return new Intl.NumberFormat(clientIntlLocale(locale), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function clientVatIncludedLabel(locale: string): string {
  return locale === "es" ? "IVA incluido" : locale === "fr" ? "TVA incluse" : locale === "en" ? "VAT included" : "IVA inclusa";
}

function appendClientVatIncluded(label: string, locale: string): string {
  return `${label} · ${clientVatIncludedLabel(locale)}`;
}

function formatClientEurWithVat(amount: number, locale: string): string {
  return appendClientVatIncluded(formatClientEur(amount, locale), locale);
}

function formatIsoDateLabel(isoDate: string, locale?: string | null): string {
  if (!isoDate) return "-";
  return new Intl.DateTimeFormat(clientIntlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00.000Z`));
}

function estimateTotalAmount(
  serviceType: string,
  passengers: PassengerBreakdown,
  selectedPrice: SelectedPrice | null,
  fareRules: PassengerFareRuleConfig[] = DEFAULT_PASSENGER_FARE_RULES,
): number | null {
  if (!selectedPrice) return null;
  return estimatePassengerFareTotal({
    serviceType,
    pricingUnit: selectedPrice.pricingUnit,
    unitPrice: selectedPrice.amount,
    passengers,
    rules: fareRules,
  });
}

function estimatePaymentBreakdown(
  totalAmount: number | null,
  paymentSchedule: "FULL" | "DEPOSIT_BALANCE",
  depositPercentage: number | null,
) {
  if (totalAmount == null) return null;
  const totalCents = Math.round(totalAmount * 100);
  if (paymentSchedule === "DEPOSIT_BALANCE") {
    const pct = depositPercentage ?? 30;
    const upfrontCents = Math.round((totalCents * pct) / 100);
    return {
      totalCents,
      upfrontCents,
      balanceCents: totalCents - upfrontCents,
      depositPercentage: pct,
    };
  }
  return { totalCents, upfrontCents: totalCents, balanceCents: 0, depositPercentage: null };
}

function formatClientCents(cents: number, locale?: string | null): string {
  return formatClientEur(cents / 100, locale);
}

export function BookingWizard(props: Props) {
  const copy = getWizardCopy(props.locale);
  // R26-A1-C1: initial state SSR-safe (match server HTML) — se il `useState`
  // initializer leggesse sessionStorage (client-only), React 19 hydration
  // mismatch perche' server rendera diverse attr `value=` / step diverso.
  // Restore in useEffect post-mount (client-side only, no hydration conflict).
  const [step, setStep] = useState<Step>("date");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [durationDays, setDurationDays] = useState<number>(props.initialDurationDays ?? 3);
  const [passengers, setPassengers] = useState<PassengerBreakdown>(() => defaultPassengers());
  const [selectedPrice, setSelectedPrice] = useState<SelectedPrice | null>(null);
  const [selectedPaymentSchedule, setSelectedPaymentSchedule] =
    useState<CheckoutPaymentSchedule>("DEPOSIT_BALANCE");
  const [customer, setCustomer] = useState<Customer>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    nationality: "IT",
    language: "it",
  });
  const [intent, setIntent] = useState<{
    confirmationCode: string;
    clientSecret: string;
    amountCents: number;
    totalCents: number;
    balanceCents: number;
  } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  // R26-A1-C2: `turnstileResetKey` cambia ogni `onRetryNeeded` → TurnstileWidget
  // vede una key diversa → remount forzato → widget re-challenge. Senza,
  // il widget retainerebbe token expired/used + `setTurnstileToken(null)`
  // lato state non puliva il widget visibile → cliente vede "solved" ma
  // server rifiuta.
  const [turnstileResetKey, setTurnstileResetKey] = useState(0);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);
  const [overrideCheck, setOverrideCheck] = useState<
    | { status: "idle" }
    | { status: "checking" }
    | { status: "blocked"; reason: string; message: string }
  >({ status: "idle" });
  // R26-P2-CRITICA: tracciamo se restore completato per gate save su dirty.
  // Senza, la prima saveDraft post-mount viene invocata con default vuoti
  // prima che il restore giunga → sovrascrive il draft salvato precedente.
  const [hydrated, setHydrated] = useState(false);
  const isCharter = props.serviceType === "CABIN_CHARTER";
  const fixedDurationDays = props.fixedDurationDays;
  const passengerFareRules = useMemo(
    () => normalizePassengerFareRules(props.passengerFareRules),
    [props.passengerFareRules],
  );
  const charterDurationDays = isCharter ? inclusiveDaysBetween(startDate, endDate) : null;
  const effectiveDurationDays = isCharter
    ? fixedDurationDays ?? charterDurationDays ?? durationDays
    : durationDays;
  const priceLookupDurationDays =
    isCharter && effectiveDurationDays >= 3 && effectiveDurationDays <= 7
      ? effectiveDurationDays
      : undefined;
  const canContinueFromDate =
    !isCharter ||
    (Boolean(fixedDurationDays) && Boolean(startDate)) ||
    (charterDurationDays !== null && charterDurationDays >= 3 && charterDurationDays <= 7);

  // R26-A1-C1 + R26-P2-CRITICA: restore in useEffect client-side per evitare
  // hydration mismatch. Dopo restore marca `hydrated=true` → save effect puo'
  // procedere senza sovrascrivere draft precedente con stati default.
  /* eslint-disable react-hooks/set-state-in-effect -- Restore post-hydration from URL/sessionStorage is intentional here. */
  useEffect(() => {
    const d = loadDraft(props.serviceId);
    if (props.initialStartDate) {
      setStartDate(props.initialStartDate);
      const nextDurationDays = props.initialDurationDays ?? 3;
      const nextEndDate = props.initialEndDate ?? addIsoDays(props.initialStartDate, nextDurationDays - 1);
      if (props.initialDurationDays) setDurationDays(props.initialDurationDays);
      if (isCharter) setEndDate(nextEndDate);
      setStep("date");
    } else if (d) {
      if (
        d.step === "people" ||
        d.step === "customer" ||
        d.step === "review" ||
        d.step === "date"
      ) {
        setStep(d.step === "review" ? "customer" : d.step);
      }
      if (typeof d.startDate === "string") setStartDate(d.startDate);
      if (typeof d.endDate === "string") setEndDate(d.endDate);
      if (typeof d.durationDays === "number") setDurationDays(d.durationDays);
      if (d.passengers && typeof d.passengers === "object") {
        setPassengers((prev) => ({ ...prev, ...d.passengers }));
      } else if (typeof d.numPeople === "number") {
        setPassengers({ adults: Math.max(1, d.numPeople), children: 0, freeChildren: 0, infants: 0 });
      }
      if (d.paymentSchedule === "FULL" || d.paymentSchedule === "DEPOSIT_BALANCE") {
        setSelectedPaymentSchedule(d.paymentSchedule);
      }
      if (d.customer && typeof d.customer === "object") {
        setCustomer((prev) => ({ ...prev, ...d.customer }));
      }
    }
    setHydrated(true);
  }, [
    props.serviceId,
    props.initialStartDate,
    props.initialEndDate,
    props.initialDurationDays,
    props.fixedDurationDays,
    isCharter,
  ]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* eslint-disable react-hooks/set-state-in-effect -- Passenger rules can be admin-configured; sanitize restored draft when active rules change. */
  useEffect(() => {
    setPassengers((current) => {
      const next = sanitizePassengerBreakdownForRules(current, passengerFareRules);
      return next.adults === current.adults &&
        next.children === current.children &&
        next.freeChildren === current.freeChildren &&
        next.infants === current.infants
        ? current
        : next;
    });
  }, [passengerFareRules]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // R26-A1-C1: persist draft ad ogni change. Skip finche' hydrated=false
  // (R26-P2-CRITICA: altrimenti overrite draft esistente con defaults).
  useEffect(() => {
    if (!hydrated) return;
    if (step === "payment" || step === "success") return;
    saveDraft(props.serviceId, {
      step,
      startDate,
      endDate,
      durationDays: effectiveDurationDays,
      passengers,
      paymentSchedule: selectedPaymentSchedule,
      customer,
    });
  }, [
    hydrated,
    props.serviceId,
    step,
    startDate,
    endDate,
    durationDays,
    effectiveDurationDays,
    passengers,
    selectedPaymentSchedule,
    customer,
  ]);

  useEffect(() => {
    if (!startDate || (isCharter && !priceLookupDurationDays)) {
      queueMicrotask(() => setSelectedPrice(null));
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      serviceId: props.serviceId,
      start: startDate,
      end: startDate,
      locale: props.locale,
    });
    if (priceLookupDurationDays) {
      params.set("durationDays", String(priceLookupDurationDays));
    }

    fetch(`/api/booking-calendar?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("price lookup failed");
        const body = (await res.json()) as { data?: { days?: CalendarApiDay[] } };
        const day = body.data?.days?.find((item) => item.date === startDate);
        if (day?.priceAmount != null && day.pricingUnit) {
          const nextPrice = {
            amount: day.priceAmount,
            pricingUnit: day.pricingUnit,
          };
          setSelectedPrice((current) =>
            current?.amount === nextPrice.amount && current.pricingUnit === nextPrice.pricingUnit
              ? current
              : nextPrice,
          );
        } else {
          setSelectedPrice(null);
        }
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") setSelectedPrice(null);
      });

    return () => controller.abort();
  }, [isCharter, priceLookupDurationDays, props.locale, props.serviceId, startDate]);

  async function createIntent() {
    setError(null);
    if (!consentPrivacy || !consentTerms) {
      setError(copy.acceptPolicies);
      return;
    }
    // In prod il server richiede Turnstile token (enforce). In dev passa senza.
    if (props.turnstileSiteKey && !turnstileToken) {
      setError(copy.completeCaptcha);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(props.useStripeCheckout ? "/api/checkout-session" : "/api/payment-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale: props.locale,
          serviceId: props.serviceId,
          // R26-A1-A2: manda raw ISO day `"YYYY-MM-DD"`. Il server applica
          // `parseDateLikelyLocalDay` (invariant #16). `new Date(ISO).toISOString()`
          // era fragile: funzionava per date pure ma un futuro switch a
          // `datetime-local` input introdurrebbe TZ silent shift.
          startDate,
          durationDays: isCharter ? effectiveDurationDays : undefined,
          passengers,
          customer,
          paymentSchedule: selectedPaymentSchedule,
          depositPercentage:
            selectedPaymentSchedule === "DEPOSIT_BALANCE"
              ? props.defaultDepositPercentage ?? 30
              : undefined,
          turnstileToken: turnstileToken ?? undefined,
          consent: {
            privacyAccepted: consentPrivacy,
            termsAccepted: consentTerms,
            policyVersion: CURRENT_POLICY_VERSION,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        // R21-A2-ALTA-1: messaggi localizzati IT per status comuni invece del
        // raw `err.message` inglese dal server. Sempre esponiamo `requestId`
        // (prefix 8 char) per correlazione log/support.
        const requestId: string | undefined = body?.error?.requestId;
        const idSuffix = requestId ? ` [ID: ${requestId.slice(0, 8)}]` : "";
        if (res.status === 429) {
          const retry = body?.error?.retryAfterSeconds;
          throw new Error(
            retry
              ? `${copy.tooManyRequestsRetry} ${retry}s.${idSuffix}`
              : `${copy.tooManyRequests}${idSuffix}`,
          );
        }
        if (res.status === 409) {
          throw new Error(
            `${copy.datesNoLongerAvailable}${idSuffix}`,
          );
        }
        if (res.status >= 500) {
          throw new Error(
            `${copy.technicalIssue} ${PUBLIC_CONTACT_EMAIL}.${idSuffix}`,
          );
        }
        // Default (400/403/404 non intercettati sopra): usa messaggio server
        // (gia' italiano per i ValidationError dei nostri schemas Zod).
        throw new Error(
          (body?.error?.message ?? copy.bookingCreationError) + idSuffix,
        );
      }
      const body = await res.json();
      const payload = body.data ?? body; // tolleranza per envelope old/new
      if (props.useStripeCheckout) {
        if (!payload.checkoutUrl || typeof payload.checkoutUrl !== "string") {
          throw new Error(copy.stripeCheckoutUnavailable);
        }
        window.location.assign(payload.checkoutUrl);
        return;
      }
      setIntent({
        confirmationCode: payload.confirmationCode,
        clientSecret: payload.clientSecret,
        amountCents: payload.amountCents,
        totalCents: payload.totalCents,
        balanceCents: payload.balanceCents ?? 0,
      });
      setStep("payment");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleContinueFromPax() {
    setOverrideCheck({ status: "checking" });
    try {
      const result = await checkOverrideEligibilityAction({
        serviceId: props.serviceId,
        startDate: startDate,
        endDate: deriveClientEndDate(
          startDate,
          isCharter ? "MULTI_DAY" : props.durationType,
          props.durationHours,
          isCharter ? effectiveDurationDays : undefined,
        ),
        durationDays: isCharter ? effectiveDurationDays : undefined,
        numPax: occupiedSeats(passengers, passengerFareRules),
      });
      if (result.status === "blocked") {
        const reasonMsg =
          result.reason === "within_15_day_cutoff"
            ? copy.overrideTooClose
            : result.reason === "insufficient_revenue"
            ? copy.overrideBooked
            : result.reason === "boat_block"
            ? copy.overrideBlockedByAdmin
            : result.reason === "external_booking"
            ? copy.overrideExternalBooking
            : result.reason === "feature_disabled"
            ? // Feature flag OFF: comportamento legacy — procediamo allo step
              // successivo, il controllo vero avverra' al createPendingDirectBooking.
              null
            : copy.overrideUnavailable;
        if (reasonMsg === null) {
          // feature disabled → legacy flow, avanza normalmente; il controllo
          // vero avverra' al createPendingDirectBooking.
          setOverrideCheck({ status: "idle" });
          setStep("customer");
          return;
        }
        setOverrideCheck({
          status: "blocked",
          reason: result.reason,
          message: reasonMsg,
        });
        return;
      }
      // "normal" | "override_request" → avanza step. In override_request il
      // wizard non mostra nulla di diverso; la conferma "in attesa" arriva via
      // email dopo createPendingDirectBooking (Task 3.3).
      setOverrideCheck({ status: "idle" });
      setStep("customer");
    } catch (err) {
      setOverrideCheck({
        status: "blocked",
        reason: "unknown",
        message:
          err instanceof Error
            ? `${copy.availabilityCheckPrefix}: ${err.message}`
            : copy.availabilityCheckError,
      });
    }
  }

  return (
    <div className="max-w-full overflow-hidden rounded-lg bg-white shadow-2xl">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
          {copy.directCheckout}
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-2xl font-heading font-bold text-slate-950">
              {props.serviceName}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {copy.headerSubtitle}
            </p>
          </div>
          <StepIndicator step={step} locale={props.locale} />
        </div>
      </div>

      <div className="p-4 sm:p-8">
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-4 p-3 rounded-lg bg-red-50 text-red-700 text-sm"
        >
          {error}
        </div>
      )}

      {step === "date" && (
        <>
          <DateStep
            locale={props.locale}
            serviceId={props.serviceId}
            value={startDate}
            endValue={endDate}
            isCharter={isCharter}
            fixedDurationDays={fixedDurationDays}
            onChange={(value) => {
              setStartDate(value);
              if (value && fixedDurationDays) {
                setEndDate(addIsoDays(value, fixedDurationDays - 1));
              } else if (endDate && value && endDate < addIsoDays(value, 2)) {
                setEndDate("");
              }
            }}
            onEndChange={setEndDate}
            onNext={() => setStep("people")}
            canContinue={Boolean(startDate) && canContinueFromDate}
            onPriceChange={setSelectedPrice}
          />
        </>
      )}

      {step === "people" && (
        <>
          <PeopleStep
            locale={props.locale}
            capacityMax={props.capacityMax}
            serviceType={props.serviceType}
            value={passengers}
            fareRules={passengerFareRules}
            selectedPrice={selectedPrice}
            onChange={setPassengers}
            onBack={() => setStep("date")}
            onNext={() => void handleContinueFromPax()}
            checking={overrideCheck.status === "checking"}
          />
          {overrideCheck.status === "checking" && (
            <div
              role="status"
              aria-live="polite"
              className="pt-3 text-sm text-gray-600"
            >
              {copy.checkingAvailability}
            </div>
          )}
          {overrideCheck.status === "blocked" && (
            <div
              role="alert"
              className="mt-3 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700"
            >
              {overrideCheck.message}
            </div>
          )}
        </>
      )}

      {step === "customer" && (
        <CustomerStep
          locale={props.locale}
          value={customer}
          onChange={setCustomer}
          onBack={() => setStep("people")}
          onNext={() => setStep("review")}
          loading={loading}
          turnstileSiteKey={props.turnstileSiteKey}
          turnstileResetKey={turnstileResetKey}
          onTurnstileToken={setTurnstileToken}
          onTurnstileExpired={() => setTurnstileToken(null)}
          consentPrivacy={consentPrivacy}
          consentTerms={consentTerms}
          onConsentPrivacyChange={setConsentPrivacy}
          onConsentTermsChange={setConsentTerms}
        />
      )}

      {step === "review" && (
          <ReviewStep
            locale={props.locale}
            serviceName={props.serviceName}
          serviceType={props.serviceType}
          durationType={props.durationType}
          durationHours={props.durationHours}
          startDate={startDate}
          endDate={deriveClientEndDate(
            startDate,
            isCharter ? "MULTI_DAY" : props.durationType,
            props.durationHours,
            isCharter ? effectiveDurationDays : undefined,
          )}
          durationDays={isCharter ? effectiveDurationDays : undefined}
          passengers={passengers}
          fareRules={passengerFareRules}
          customer={customer}
          selectedPrice={selectedPrice}
          paymentSchedule={selectedPaymentSchedule}
          depositPercentage={props.defaultDepositPercentage ?? 30}
          onPaymentScheduleChange={setSelectedPaymentSchedule}
          loading={loading}
          onBack={() => setStep("customer")}
          onConfirm={() => void createIntent()}
        />
      )}

      {step === "payment" && intent && (
        <StripePaymentForm
          locale={props.locale}
          appUrl={props.appUrl}
          customer={customer}
          clientSecret={intent.clientSecret}
          confirmationCode={intent.confirmationCode}
          amountCents={intent.amountCents}
          totalCents={intent.totalCents}
          balanceCents={intent.balanceCents}
          onSuccess={() => {
            clearDraft(props.serviceId);
            setStep("success");
          }}
          onRetryNeeded={() => {
            // R15-UX-1: errore Stripe terminale (card_declined ecc). Il
            // clientSecret non e' piu' utilizzabile; torniamo ai dati per
            // ricreare PI e checkout con lo stesso riepilogo.
            // R26-A1-C2: bump turnstileResetKey → remount widget → re-challenge.
            setIntent(null);
            setTurnstileToken(null);
            setTurnstileResetKey((k) => k + 1);
            setStep("customer");
          }}
        />
      )}

      {step === "success" && intent && (
        <div className="text-center space-y-4 py-8">
          <h2 className="text-3xl font-bold text-emerald-600">{copy.paymentCompleted}</h2>
          <p className="text-lg">
            {copy.code}: <strong>{intent.confirmationCode}</strong>
          </p>
          <p className="text-gray-600">
            {copy.successText}
          </p>
          <a
            href={bookingSuccessPath(props.locale, intent.confirmationCode)}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
          >
            {copy.openSummary}
          </a>
        </div>
      )}
      </div>
    </div>
  );
}

function StepIndicator({ step, locale }: { step: Step; locale: string }) {
  const steps = locale === "es" ? CHECKOUT_STEPS_ES : locale === "fr" ? CHECKOUT_STEPS_FR : locale === "en" ? CHECKOUT_STEPS_EN : CHECKOUT_STEPS;
  const activeIndex = step === "success" ? steps.length : steps.findIndex((item) => item.key === step);

  return (
    <ol
      className="flex w-full items-center gap-1 text-xs font-semibold text-slate-500 sm:grid sm:w-auto sm:min-w-[360px] sm:grid-cols-5"
      aria-label={locale === "es" ? "Estado del checkout" : locale === "fr" ? "État du checkout" : locale === "en" ? "Checkout status" : "Stato checkout"}
    >
      {steps.map((item, index) => {
        const Icon = item.icon;
        const active = index === activeIndex;
        const complete = index < activeIndex;
        return (
          <li
            key={item.key}
            className={cnStep(
              "flex h-9 min-w-0 items-center justify-center gap-1.5 rounded-full px-2 transition sm:h-auto sm:px-2 sm:py-2",
              active ? "flex-[1.8] sm:flex-auto" : "size-9 shrink-0 px-0 sm:h-auto sm:w-auto sm:shrink sm:flex-auto sm:px-2",
              active && "bg-sky-100 text-sky-900",
              complete && "bg-emerald-50 text-emerald-700",
            )}
            aria-current={active ? "step" : undefined}
          >
            {complete ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
            <span className={cnStep("truncate sm:inline", active ? "inline" : "hidden")}>
              {item.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function cnStep(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function getWizardCopy(locale: string) {
  if (locale === "fr") {
    return {
      directCheckout: "Checkout direct",
      headerSubtitle: "Date, invités, coordonnées client et paiement en ligne.",
      acceptPolicies: "Acceptez la Politique de confidentialité et les Conditions générales pour continuer",
      completeCaptcha: "Complétez la vérification CAPTCHA avant de continuer",
      tooManyRequestsRetry: "Trop de demandes. Réessayez dans",
      tooManyRequests: "Trop de demandes. Réessayez dans quelques minutes.",
      datesNoLongerAvailable: "Ces dates ne sont plus disponibles. Essayez d'autres dates.",
      technicalIssue: "Problème technique temporaire. Réessayez dans quelques minutes ou écrivez-nous à",
      bookingCreationError: "Erreur lors de la création de la réservation",
      stripeCheckoutUnavailable: "Le checkout Stripe n'est pas disponible. Réessayez dans quelques instants.",
      overrideTooClose:
        "Cette date n'est plus disponible car elle est trop proche de l'expérience, à moins de 15 jours.",
      overrideBooked: "Cette date est déjà réservée. Essayez une autre date.",
      overrideBlockedByAdmin: "Cette date a été bloquée par l'équipe pour maintenance.",
      overrideExternalBooking:
        "Cette date est déjà occupée par une réservation confirmée sur un portail externe. Essayez une autre date.",
      overrideUnavailable: "Cette date n'est pas disponible pour ce forfait.",
      availabilityCheckPrefix: "Erreur de vérification des disponibilités",
      availabilityCheckError: "Erreur de vérification des disponibilités. Réessayez.",
      checkingAvailability: "Vérification des disponibilités...",
      paymentCompleted: "Paiement finalisé",
      code: "Code",
      successText:
        "Nous finalisons la réservation dans le système central. Consultez votre email pour les détails.",
      openSummary: "Ouvrir le résumé",
    };
  }

  if (locale === "es") {
    return {
      directCheckout: "Checkout directo",
      headerSubtitle: "Fecha, huéspedes, datos del cliente y pago online.",
      acceptPolicies: "Acepta la Política de privacidad y los Términos y condiciones para continuar",
      completeCaptcha: "Completa la verificación CAPTCHA antes de continuar",
      tooManyRequestsRetry: "Demasiadas solicitudes. Inténtalo de nuevo en",
      tooManyRequests: "Demasiadas solicitudes. Inténtalo de nuevo en unos minutos.",
      datesNoLongerAvailable: "Estas fechas ya no están disponibles. Prueba con otras fechas.",
      technicalIssue: "Problema técnico temporal. Inténtalo de nuevo en unos minutos o escríbenos a",
      bookingCreationError: "Error al crear la reserva",
      stripeCheckoutUnavailable: "El checkout de Stripe no está disponible. Inténtalo de nuevo dentro de poco.",
      overrideTooClose:
        "Esta fecha ya no está disponible porque está demasiado cerca de la experiencia, a menos de 15 días.",
      overrideBooked: "Esta fecha ya está reservada. Prueba otra fecha.",
      overrideBlockedByAdmin: "Esta fecha ha sido bloqueada por el equipo por mantenimiento.",
      overrideExternalBooking:
        "Esta fecha ya está ocupada por una reserva confirmada en un portal externo. Prueba otra fecha.",
      overrideUnavailable: "Esta fecha no está disponible para este paquete.",
      availabilityCheckPrefix: "Error al comprobar disponibilidad",
      availabilityCheckError: "Error al comprobar disponibilidad. Inténtalo de nuevo.",
      checkingAvailability: "Comprobando disponibilidad...",
      paymentCompleted: "Pago completado",
      code: "Código",
      successText:
        "Estamos finalizando la reserva en el sistema central. Revisa tu email para ver los detalles.",
      openSummary: "Abrir resumen",
    };
  }

  if (locale === "en") {
    return {
      directCheckout: "Direct checkout",
      headerSubtitle: "Date, guests, customer details and online payment.",
      acceptPolicies: "Accept the Privacy Policy and Terms & Conditions to continue",
      completeCaptcha: "Complete CAPTCHA verification before continuing",
      tooManyRequestsRetry: "Too many requests. Try again in",
      tooManyRequests: "Too many requests. Try again in a few minutes.",
      datesNoLongerAvailable: "These dates are no longer available. Try choosing different dates.",
      technicalIssue: "Temporary technical issue. Try again in a few minutes or write to",
      bookingCreationError: "Booking creation error",
      stripeCheckoutUnavailable: "Stripe checkout is not available. Try again shortly.",
      overrideTooClose:
        "This date is no longer available because it is too close to the experience, less than 15 days away.",
      overrideBooked: "This date is already booked. Try another date.",
      overrideBlockedByAdmin: "This date has been blocked by the staff for maintenance.",
      overrideExternalBooking:
        "This date is already occupied by a confirmed booking on an external portal. Try another date.",
      overrideUnavailable: "This date is not available for this package.",
      availabilityCheckPrefix: "Availability check error",
      availabilityCheckError: "Availability check error. Try again.",
      checkingAvailability: "Checking availability...",
      paymentCompleted: "Payment completed",
      code: "Code",
      successText:
        "We are finalizing the booking on the central system. Check your email for the details.",
      openSummary: "Open summary",
    };
  }

  return {
    directCheckout: "Checkout diretto",
    headerSubtitle: "Data, ospiti, dati cliente e pagamento online.",
    acceptPolicies: "Accetta Privacy Policy e Termini & Condizioni per continuare",
    completeCaptcha: "Completa la verifica CAPTCHA prima di continuare",
    tooManyRequestsRetry: "Troppe richieste. Riprova tra",
    tooManyRequests: "Troppe richieste, riprova tra qualche minuto.",
    datesNoLongerAvailable: "Queste date non sono più disponibili. Prova a sceglierne altre.",
    technicalIssue: "Problema tecnico momentaneo. Riprova tra qualche minuto o scrivici a",
    bookingCreationError: "Errore creazione prenotazione",
    stripeCheckoutUnavailable: "Checkout Stripe non disponibile. Riprova tra poco.",
    overrideTooClose:
      "Questa data non è più disponibile perché troppo vicina all'esperienza, meno di 15 giorni.",
    overrideBooked: "Questa data è già prenotata. Prova un'altra data.",
    overrideBlockedByAdmin: "Questa data è stata bloccata dall'amministrazione per manutenzione.",
    overrideExternalBooking:
      "Questa data è già occupata da una prenotazione confermata su un portale esterno. Prova un'altra data.",
    overrideUnavailable: "Questa data non è disponibile per questo pacchetto.",
    availabilityCheckPrefix: "Errore verifica disponibilità",
    availabilityCheckError: "Errore verifica disponibilità. Riprova.",
    checkingAvailability: "Verifica disponibilità in corso...",
    paymentCompleted: "Pagamento completato",
    code: "Codice",
    successText:
      "Stiamo finalizzando la prenotazione sul sistema centrale. Controlla la tua email per i dettagli.",
    openSummary: "Apri riepilogo",
  };
}

function getDateStepCopy(locale: string) {
  if (locale === "fr") {
    return {
      title: "Choisissez une date disponible",
      calendarLegend: "Calendrier des disponibilités et des prix",
      calendarUnavailable: "Calendrier indisponible",
      calendarLoadError: "Nous ne pouvons pas charger les disponibilités et les prix pour le moment. Réessayez bientôt.",
      previousMonth: "Mois précédent",
      nextMonth: "Mois suivant",
      weekdays: ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"],
      includedInSelectedRange: ", inclus dans la période sélectionnée",
      available: "Disponible",
      onRequest: "Sur demande",
      unavailable: "Indisponible",
      selectedDate: "Date sélectionnée",
      selected: "Sélectionnée",
      selectedDuration: "Durée sélectionnée",
      days: "jours",
      until: "jusqu'au",
      to: "Au",
      charterTooShort: "Le charter nécessite au moins 3 jours.",
      charterTooLong: "Pour les charters de plus de 7 jours, contactez l'équipe pour un devis dédié.",
      next: "Suivant",
    };
  }

  if (locale === "es") {
    return {
      title: "Elige una fecha disponible",
      calendarLegend: "Calendario de disponibilidad y precios",
      calendarUnavailable: "Calendario no disponible",
      calendarLoadError: "No podemos cargar disponibilidad y precios ahora. Inténtalo de nuevo dentro de poco.",
      previousMonth: "Mes anterior",
      nextMonth: "Mes siguiente",
      weekdays: ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"],
      includedInSelectedRange: ", incluido en el intervalo seleccionado",
      available: "Disponible",
      onRequest: "Bajo petición",
      unavailable: "No disponible",
      selectedDate: "Fecha seleccionada",
      selected: "Seleccionada",
      selectedDuration: "Duración seleccionada",
      days: "días",
      until: "hasta el",
      to: "A",
      charterTooShort: "El charter requiere al menos 3 días.",
      charterTooLong: "Para charters de más de 7 días, contacta con el equipo para un presupuesto dedicado.",
      next: "Siguiente",
    };
  }

  if (locale === "en") {
    return {
      title: "Choose an available date",
      calendarLegend: "Availability and price calendar",
      calendarUnavailable: "Calendar unavailable",
      calendarLoadError: "We cannot load availability and prices right now. Try again shortly.",
      previousMonth: "Previous month",
      nextMonth: "Next month",
      weekdays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      includedInSelectedRange: ", included in the selected range",
      available: "Available",
      onRequest: "On request",
      unavailable: "Unavailable",
      selectedDate: "Selected date",
      selected: "Selected",
      selectedDuration: "Selected duration",
      days: "days",
      until: "until",
      to: "To",
      charterTooShort: "Charter requires at least 3 days.",
      charterTooLong: "For charters longer than 7 days, contact the crew for a dedicated quote.",
      next: "Next",
    };
  }

  return {
    title: "Scegli una data disponibile",
    calendarLegend: "Calendario disponibilità e prezzi",
    calendarUnavailable: "Calendario non disponibile",
    calendarLoadError: "Non riesco a caricare disponibilità e prezzi. Riprova tra poco.",
    previousMonth: "Mese precedente",
    nextMonth: "Mese successivo",
    weekdays: ["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"],
    includedInSelectedRange: ", incluso nell'intervallo selezionato",
    available: "Libera",
    onRequest: "Su richiesta",
    unavailable: "Non disponibile",
    selectedDate: "Data selezionata",
    selected: "Selezionata",
    selectedDuration: "Durata selezionata",
    days: "giornate",
    until: "fino al",
    to: "A",
    charterTooShort: "Il charter richiede almeno 3 giornate.",
    charterTooLong:
      "Per charter più lunghi di 7 giornate contatta la crew per un preventivo dedicato.",
    next: "Avanti",
  };
}

function getPeopleStepCopy(locale: string) {
  if (locale === "fr") {
    return {
      title: "Qui monte à bord ?",
      seatsUsed: "Places occupées",
      paidUnits: "Unités payantes",
      estimatedTotal: "Total estimé",
      loading: "Chargement",
      totalGuests: "Total invités",
      capacityExceeded: "Vous avez sélectionné plus de places que la capacité disponible.",
      back: "Retour",
      next: "Suivant",
      checking: "Vérification...",
      decrease: "Diminuer",
      increase: "Augmenter",
    };
  }

  if (locale === "es") {
    return {
      title: "¿Quién sube a bordo?",
      seatsUsed: "Plazas ocupadas",
      paidUnits: "Unidades pagadas",
      estimatedTotal: "Total estimado",
      loading: "Cargando",
      totalGuests: "Total de huéspedes",
      capacityExceeded: "Has seleccionado más plazas que la capacidad disponible.",
      back: "Atrás",
      next: "Siguiente",
      checking: "Comprobando...",
      decrease: "Disminuir",
      increase: "Aumentar",
    };
  }

  if (locale === "en") {
    return {
      title: "Who is coming on board?",
      seatsUsed: "Seats used",
      paidUnits: "Paid units",
      estimatedTotal: "Estimated total",
      loading: "Loading",
      totalGuests: "Total guests",
      capacityExceeded: "You selected more seats than the available capacity.",
      back: "Back",
      next: "Next",
      checking: "Checking...",
      decrease: "Decrease",
      increase: "Increase",
    };
  }

  return {
    title: "Chi sale a bordo?",
    seatsUsed: "Posti occupati",
    paidUnits: "Quote paganti",
    estimatedTotal: "Totale stimato",
    loading: "In caricamento",
    totalGuests: "Totale ospiti",
    capacityExceeded: "Hai selezionato più posti della capacità disponibile.",
    back: "Indietro",
    next: "Avanti",
    checking: "Verifica...",
    decrease: "Diminuisci",
    increase: "Aumenta",
  };
}

function getReviewStepCopy(locale: string) {
  if (locale === "fr") {
    return {
      days: "jours",
      hours: "heures",
      oneGuest: "1 invité",
      guests: "invités",
      fullPayment: "Paiement complet",
      seatsUsed: "Places occupées",
      paidUnits: "Unités payantes",
      eyebrow: "Vérifiez avant de payer",
      title: "Résumé de réservation",
      subtitle: "Le paiement Stripe ne s'ouvrira qu'après cette confirmation.",
      paymentQuestion: "Comment souhaitez-vous payer ?",
      recommended: "Recommandé",
      depositDescription: "Bloquez la date maintenant en payant uniquement l'acompte.",
      calculating: "Calcul en cours",
      fullPaymentDescription: "Réglez maintenant toute la réservation par carte.",
      depositNote:
        "Le montant payé en ligne suit la politique d'annulation. Le solde restant est réglé sur place avant le départ.",
      summary: "Résumé",
      date: "Date",
      duration: "Durée",
      guestsLabel: "Invités",
      customer: "Client",
      phone: "Téléphone",
      payment: "Paiement",
      total: "Total",
      now: "Maintenant",
      balanceOnSite: "Solde sur place",
      priceUnavailable:
        "Prix pas encore disponible. Revenez à la date et sélectionnez une journée avec des prix configurés.",
      serverRecalculationNote:
        "Le total final est recalculé par le serveur lors de la confirmation, selon les disponibilités, les prix et les réductions configurées. Le solde éventuel est réglé sur place avant le départ.",
      editDetails: "Modifier les coordonnées",
      creatingPayment: "Création du paiement...",
      confirmAndPay: "Confirmer et aller sur Stripe",
    };
  }

  if (locale === "es") {
    return {
      days: "días",
      hours: "horas",
      oneGuest: "1 huésped",
      guests: "huéspedes",
      fullPayment: "Pago completo",
      seatsUsed: "Plazas ocupadas",
      paidUnits: "Unidades pagadas",
      eyebrow: "Comprueba antes de pagar",
      title: "Resumen de reserva",
      subtitle: "El pago con Stripe se abrirá solo después de esta confirmación.",
      paymentQuestion: "¿Cómo quieres pagar?",
      recommended: "Recomendado",
      depositDescription: "Bloquea la fecha ahora pagando solo el depósito.",
      calculating: "Calculando",
      fullPaymentDescription: "Paga ahora toda la reserva con tarjeta.",
      depositNote:
        "El importe pagado online sigue la política de cancelación. El saldo restante se paga en destino antes de la salida.",
      summary: "Resumen",
      date: "Fecha",
      duration: "Duración",
      guestsLabel: "Huéspedes",
      customer: "Cliente",
      phone: "Teléfono",
      payment: "Pago",
      total: "Total",
      now: "Ahora",
      balanceOnSite: "Saldo en destino",
      priceUnavailable:
        "Precio aún no disponible. Vuelve a la fecha y selecciona un día con precios configurados.",
      serverRecalculationNote:
        "El total final se recalcula en el servidor al confirmar, usando disponibilidad, precios y descuentos configurados. El saldo, si existe, se paga en destino antes de la salida.",
      editDetails: "Modificar datos",
      creatingPayment: "Creando pago...",
      confirmAndPay: "Confirmar e ir a Stripe",
    };
  }

  if (locale === "en") {
    return {
      days: "days",
      hours: "hours",
      oneGuest: "1 guest",
      guests: "guests",
      fullPayment: "Full payment",
      seatsUsed: "Seats used",
      paidUnits: "Paid units",
      eyebrow: "Check before paying",
      title: "Booking summary",
      subtitle: "Stripe payment will open only after this confirmation.",
      paymentQuestion: "How would you like to pay?",
      recommended: "Recommended",
      depositDescription: "Secure the date now by paying only the deposit.",
      calculating: "Calculating",
      fullPaymentDescription: "Pay the full booking now by card.",
      depositNote:
        "The amount paid online follows the cancellation policy. The remaining balance is paid on site before departure.",
      summary: "Summary",
      date: "Date",
      duration: "Duration",
      guestsLabel: "Guests",
      customer: "Customer",
      phone: "Phone",
      payment: "Payment",
      total: "Total",
      now: "Now",
      balanceOnSite: "Balance on site",
      priceUnavailable:
        "Price not available yet. Go back to the date and select a day with configured pricing.",
      serverRecalculationNote:
        "The final total is recalculated by the server at confirmation, using availability, pricing and configured discounts. Any balance is paid on site before departure.",
      editDetails: "Edit details",
      creatingPayment: "Creating payment...",
      confirmAndPay: "Confirm and go to Stripe",
    };
  }

  return {
    days: "giornate",
    hours: "ore",
    oneGuest: "1 ospite",
    guests: "ospiti",
    fullPayment: "Pagamento completo",
    seatsUsed: "Posti occupati",
    paidUnits: "Quote paganti",
    eyebrow: "Controlla prima di pagare",
    title: "Riepilogo prenotazione",
    subtitle: "Il pagamento verrà aperto su Stripe solo dopo questa conferma.",
    paymentQuestion: "Come vuoi pagare?",
    recommended: "Consigliato",
    depositDescription: "Blocchi subito la data pagando solo l'acconto.",
    calculating: "In calcolo",
    fullPaymentDescription: "Saldi tutta la prenotazione adesso con carta.",
    depositNote:
      "La quota pagata online segue la policy di cancellazione. Il saldo restante verrà pagato in loco prima della partenza.",
    summary: "Riepilogo",
    date: "Data",
    duration: "Durata",
    guestsLabel: "Ospiti",
    customer: "Cliente",
    phone: "Telefono",
    payment: "Pagamento",
    total: "Totale",
    now: "Ora",
    balanceOnSite: "Saldo in loco",
    priceUnavailable:
      "Prezzo non ancora disponibile. Torna alla data e seleziona una giornata con listino.",
    serverRecalculationNote:
      "Il totale definitivo viene ricalcolato dal server al momento della conferma, usando disponibilità, listino e sconti configurati. Il saldo, se presente, si paga solo in loco prima della partenza.",
    editDetails: "Modifica dati",
    creatingPayment: "Creo il pagamento...",
    confirmAndPay: "Conferma e vai a Stripe",
  };
}

function getCustomerStepCopy(locale: string) {
  if (locale === "fr") {
    return {
      title: "Vos coordonnées",
      firstName: "Prénom",
      lastName: "Nom",
      phone: "Téléphone",
      privacyPrefix: "J'ai lu et j'accepte la",
      termsPrefix: "J'accepte les",
      terms: "Conditions générales",
      termsSuffix: "de réservation, y compris la politique d'annulation.",
      back: "Retour",
      wait: "Veuillez patienter...",
      continueToPayment: "Continuer vers le paiement",
    };
  }

  if (locale === "es") {
    return {
      title: "Tus datos",
      firstName: "Nombre",
      lastName: "Apellidos",
      phone: "Teléfono",
      privacyPrefix: "He leído y acepto la",
      termsPrefix: "Acepto los",
      terms: "Términos y condiciones",
      termsSuffix: "de reserva, incluida la política de cancelación.",
      back: "Atrás",
      wait: "Espera...",
      continueToPayment: "Continuar al pago",
    };
  }

  if (locale === "en") {
    return {
      title: "Your details",
      firstName: "First name",
      lastName: "Last name",
      phone: "Phone",
      privacyPrefix: "I have read and accept the",
      termsPrefix: "I accept the",
      terms: "Terms & Conditions",
      termsSuffix: "of booking, including the cancellation policy.",
      back: "Back",
      wait: "Please wait...",
      continueToPayment: "Continue to payment",
    };
  }

  return {
    title: "I tuoi dati",
    firstName: "Nome",
    lastName: "Cognome",
    phone: "Telefono",
    privacyPrefix: "Ho letto e accetto la",
    termsPrefix: "Accetto i",
    terms: "Termini & Condizioni",
    termsSuffix: "di prenotazione, inclusa la policy di cancellazione.",
    back: "Indietro",
    wait: "Attendere...",
    continueToPayment: "Procedi al pagamento",
  };
}

function passengerRuleLabel(rule: PassengerFareRuleConfig, locale: string): string {
  if (locale === "fr") {
    if (rule.category === "ADULT") return "Adultes";
    if (rule.category === "CHILD") return "Enfants";
    if (rule.category === "FREE_CHILD") return "Jeunes enfants";
    return "Bébés";
  }
  if (locale === "es") {
    if (rule.category === "ADULT") return "Adultos";
    if (rule.category === "CHILD") return "Niños";
    if (rule.category === "FREE_CHILD") return "Niños pequeños";
    return "Bebés";
  }
  if (locale !== "en") return rule.label;
  if (rule.category === "ADULT") return "Adults";
  if (rule.category === "CHILD") return "Children";
  if (rule.category === "FREE_CHILD") return "Young children";
  return "Infants";
}

function passengerRuleHint(rule: PassengerFareRuleConfig, locale: string): string {
  if (locale === "fr") {
    if (rule.category === "ADULT") return "Âge 10+";
    if (rule.category === "CHILD") return "Âge 5-9";
    if (rule.category === "FREE_CHILD") return "Âge 3-4";
    return "Âge 0-2";
  }
  if (locale === "es") {
    if (rule.category === "ADULT") return "Edad 10+";
    if (rule.category === "CHILD") return "Edad 5-9";
    if (rule.category === "FREE_CHILD") return "Edad 3-4";
    return "Edad 0-2";
  }
  if (locale !== "en") return rule.ageLabel;
  if (rule.category === "ADULT") return "Age 10+";
  if (rule.category === "CHILD") return "Age 5-9";
  if (rule.category === "FREE_CHILD") return "Age 3-4";
  return "Age 0-2";
}

interface CalendarApiDay {
  date: string;
  status: "available" | "request" | "unavailable";
  selectable: boolean;
  priceLabel: string | null;
  priceHint: string | null;
  priceAmount: number | null;
  pricingUnit: string | null;
  spotsRemaining: number | null;
  reasonLabel: string | null;
}

interface WeatherApiResponse {
  data?: {
    weather?: PublicWeatherSummary | null;
  };
}

function calendarDayAriaLabel(
  date: string,
  day?: CalendarApiDay,
  locale?: string | null,
): string {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const formatted = new Intl.DateTimeFormat(clientIntlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
  if (!day) {
    return `${formatted}, ${isEs ? "cargando disponibilidad" : isFr ? "chargement des disponibilités" : isEn ? "loading availability" : "caricamento disponibilità"}`;
  }
  const price = day.priceLabel ? `, ${day.priceLabel}` : "";
  return `${formatted}, ${day.reasonLabel ?? (isEs ? "no disponible" : isFr ? "indisponible" : isEn ? "unavailable" : "non disponibile")}${price}`;
}

function calendarDayClass({
  selected,
  rangeSelected,
  outOfMonth,
  status,
  loading,
}: {
  selected: boolean;
  rangeSelected: boolean;
  outOfMonth: boolean;
  status?: CalendarApiDay["status"];
  loading: boolean;
}): string {
  return cnStep(
    "relative flex aspect-square min-h-11 flex-col items-center justify-center overflow-hidden rounded-md border text-center transition focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:cursor-not-allowed sm:min-h-[76px] sm:items-stretch sm:justify-start sm:gap-1 sm:p-1.5 sm:text-left",
    (selected || rangeSelected) &&
      "border-sky-700 bg-sky-700 text-white shadow-sm ring-2 ring-sky-200 hover:bg-sky-800",
    !selected && !rangeSelected && !status && "border-slate-200 bg-white text-slate-400",
    !selected &&
      !rangeSelected &&
      status === "available" &&
      "border-emerald-200 bg-white text-slate-950 hover:bg-emerald-50",
    !selected &&
      !rangeSelected &&
      status === "request" &&
      "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
    !selected &&
      !rangeSelected &&
      status === "unavailable" &&
      "border-slate-200 bg-slate-100 text-slate-400",
    outOfMonth && !selected && !rangeSelected && "opacity-55",
    loading && "animate-pulse",
  );
}

function calendarDayDotClass({
  selected,
  rangeSelected,
  status,
  loading,
}: {
  selected: boolean;
  rangeSelected: boolean;
  status?: CalendarApiDay["status"];
  loading: boolean;
}): string {
  return cnStep(
    "mt-1 size-1.5 rounded-full sm:hidden",
    (selected || rangeSelected) && "bg-white",
    !selected && !rangeSelected && status === "available" && "bg-emerald-500",
    !selected && !rangeSelected && status === "request" && "bg-amber-500",
    !selected && !rangeSelected && status === "unavailable" && "bg-slate-300",
    !selected && !rangeSelected && !status && "bg-slate-200",
    loading && "animate-pulse",
  );
}

function calendarStatusBadgeClass(status?: CalendarApiDay["status"]): string {
  return cnStep(
    "rounded-full px-2.5 py-1 text-xs font-bold",
    status === "available" && "bg-emerald-100 text-emerald-800",
    status === "request" && "bg-amber-100 text-amber-800",
    status === "unavailable" && "bg-slate-200 text-slate-600",
    !status && "bg-slate-100 text-slate-600",
  );
}

function DateStep({
  locale,
  serviceId,
  value,
  endValue,
  isCharter,
  fixedDurationDays,
  onChange,
  onEndChange,
  onNext,
  canContinue,
  onPriceChange,
}: {
  locale: string;
  serviceId: string;
  value: string;
  endValue: string;
  isCharter: boolean;
  fixedDurationDays?: number;
  onChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onNext: () => void;
  canContinue: boolean;
  onPriceChange: (price: SelectedPrice | null) => void;
}) {
  const copy = getDateStepCopy(locale);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    monthKeyFromIso(value || new Date().toISOString().slice(0, 10)),
  );
  const [calendarDays, setCalendarDays] = useState<Record<string, CalendarApiDay>>({});
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [weatherSummary, setWeatherSummary] = useState<PublicWeatherSummary | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState(false);
  const charterDurationDays = isCharter ? inclusiveDaysBetween(value, endValue) : null;
  const charterIsTooShort =
    isCharter &&
    Boolean(value && endValue) &&
    (charterDurationDays === null || charterDurationDays < 3);
  const charterIsTooLong = isCharter && charterDurationDays !== null && charterDurationDays > 7;
  const endMin = value ? addIsoDays(value, 2) : new Date().toISOString().slice(0, 10);
  const fixedEndDate =
    isCharter && fixedDurationDays && value ? addIsoDays(value, fixedDurationDays - 1) : "";
  const selectedRangeEnd =
    isCharter && value ? fixedEndDate || (endValue >= value ? endValue : value) : value;
  const range = useMemo(() => calendarRange(visibleMonth), [visibleMonth]);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const canGoPrevious = visibleMonth > currentMonth;
  const selectedDay = value ? calendarDays[value] : undefined;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      serviceId,
      start: range.start,
      end: range.end,
      locale,
    });
    if (isCharter && fixedDurationDays) {
      params.set("durationDays", String(fixedDurationDays));
    }
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setCalendarLoading(true);
        setCalendarError(null);
      }
    });
    fetch(`/api/booking-calendar?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(copy.calendarUnavailable);
        const body = (await res.json()) as { data?: { days?: CalendarApiDay[] } };
        const next: Record<string, CalendarApiDay> = {};
        for (const day of body.data?.days ?? []) {
          next[day.date] = day;
        }
        setCalendarDays(next);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setCalendarError(copy.calendarLoadError);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCalendarLoading(false);
      });

    return () => controller.abort();
  }, [fixedDurationDays, isCharter, locale, range.end, range.start, serviceId]);

  useEffect(() => {
    const day = value ? calendarDays[value] : null;
    if (day?.priceAmount != null && day.pricingUnit) {
      onPriceChange({ amount: day.priceAmount, pricingUnit: day.pricingUnit });
    } else {
      onPriceChange(null);
    }
  }, [calendarDays, onPriceChange, value]);

  useEffect(() => {
    if (!value) {
      setWeatherSummary(null);
      setWeatherLoading(false);
      setWeatherError(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({ date: value, locale });
    setWeatherLoading(true);
    setWeatherError(false);

    fetch(`/api/weather?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error("weather lookup failed");
        const body = (await res.json()) as WeatherApiResponse;
        setWeatherSummary(body.data?.weather ?? null);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setWeatherSummary(null);
          setWeatherError(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setWeatherLoading(false);
      });

    return () => controller.abort();
  }, [locale, value]);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (canContinue) onNext();
      }}
    >
      <h2 className="text-2xl font-bold leading-tight">{copy.title}</h2>
      <fieldset className="rounded-lg border border-slate-200 bg-white p-2 shadow-sm sm:bg-slate-50 sm:p-4">
        <legend className="sr-only">{copy.calendarLegend}</legend>
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
            disabled={!canGoPrevious}
            className="inline-flex size-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 disabled:opacity-40"
            aria-label={copy.previousMonth}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <p className="min-w-0 text-center text-base font-bold capitalize text-slate-950">
            {monthLabel(visibleMonth, locale)}
          </p>
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}
            className="inline-flex size-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700"
            aria-label={copy.nextMonth}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5 text-center text-[11px] font-bold uppercase text-slate-500 sm:gap-1">
          {copy.weekdays.map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-0.5 sm:gap-1">
          {range.days.map((date) => {
            const day = calendarDays[date];
            const outOfMonth = monthKeyFromIso(date) !== visibleMonth;
            const selected = value === date;
            const rangeSelected = Boolean(
              value && selectedRangeEnd && date >= value && date <= selectedRangeEnd,
            );
            const includedInSelectedRange = rangeSelected && !selected;
            const selectable = Boolean(day?.selectable);
            return (
              <button
                key={date}
                type="button"
                disabled={!selectable}
                onClick={() => {
                  onChange(date);
                  if (day?.priceAmount != null && day.pricingUnit) {
                    onPriceChange({ amount: day.priceAmount, pricingUnit: day.pricingUnit });
                  } else {
                    onPriceChange(null);
                  }
                  if (outOfMonth) setVisibleMonth(monthKeyFromIso(date));
                }}
                aria-pressed={selected || rangeSelected}
                aria-label={`${calendarDayAriaLabel(date, day, locale)}${
                  includedInSelectedRange ? copy.includedInSelectedRange : ""
                }`}
                className={calendarDayClass({
                  selected,
                  rangeSelected,
                  outOfMonth,
                  status: day?.status,
                  loading: calendarLoading && !day,
                })}
              >
                <span className="block w-full shrink-0 text-center text-sm font-bold leading-none sm:text-left">
                  {Number(date.slice(8, 10))}
                </span>
                <span className="mt-1 hidden min-h-4 w-full max-w-full truncate text-center text-[11px] font-semibold leading-tight tabular-nums sm:mt-0 sm:block sm:text-left">
                  {includedInSelectedRange
                    ? locale === "es"
                      ? "Incluido"
                      : locale === "fr"
                        ? "Inclus"
                      : locale === "en"
                      ? "Included"
                      : "Incluso"
                    : day?.priceLabel ?? (calendarLoading ? "..." : "")}
                </span>
                <span className="mt-0.5 hidden min-h-4 w-full max-w-full truncate text-center text-[10px] leading-tight sm:block sm:text-left">
                  {includedInSelectedRange
                    ? locale === "es"
                      ? "Intervalo seleccionado"
                      : locale === "fr"
                        ? "Période sélectionnée"
                      : locale === "en"
                      ? "Selected range"
                      : "Intervallo selezionato"
                    : day?.reasonLabel ?? ""}
                </span>
                <span
                  className={calendarDayDotClass({
                    selected,
                    rangeSelected,
                    status: day?.status,
                    loading: calendarLoading && !day,
                  })}
                  aria-hidden="true"
                />
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
            {copy.available}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
            {copy.onRequest}
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-slate-300" aria-hidden="true" />
            {copy.unavailable}
          </span>
        </div>
        {calendarError && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {calendarError}
          </p>
        )}
      </fieldset>
      {value && (
        <div className="space-y-3">
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-sm text-emerald-900">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-700">
                  {copy.selectedDate}
                </p>
                <p className="mt-1 font-bold">{formatIsoDateLabel(value, locale)}</p>
                {selectedDay?.priceHint && (
                  <p className="mt-1 text-xs leading-5 text-emerald-800">
                    {selectedDay.priceHint}
                  </p>
                )}
              </div>
              <span className={calendarStatusBadgeClass(selectedDay?.status)}>
                {selectedDay?.reasonLabel ?? copy.selected}
              </span>
            </div>
            {selectedDay?.priceLabel && (
              <p className="mt-3 border-t border-emerald-200 pt-2 font-bold tabular-nums">
                {selectedDay.priceLabel}
              </p>
            )}
          </div>
          {weatherLoading ? (
            <div className="rounded-lg border border-sky-100 bg-sky-50/80 p-3 text-sm text-sky-900">
              {locale === "es"
                ? "Cargando previsión meteorológica..."
                : locale === "fr"
                  ? "Chargement des prévisions météo..."
                  : locale === "en"
                    ? "Loading weather forecast..."
                    : "Carico previsione meteo..."}
            </div>
          ) : weatherSummary ? (
            <CustomerWeatherCard
              summary={weatherSummary}
              locale={locale}
              title={
                locale === "es"
                  ? "Previsión para la fecha seleccionada"
                  : locale === "fr"
                    ? "Prévisions pour la date sélectionnée"
                    : locale === "en"
                      ? "Forecast for selected date"
                      : "Meteo per la data selezionata"
              }
            />
          ) : weatherError ? (
            <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              {locale === "es"
                ? "La previsión meteorológica no está disponible ahora."
                : locale === "fr"
                  ? "Les prévisions météo ne sont pas disponibles pour le moment."
                : locale === "en"
                ? "Weather forecast is not available right now."
                : "Previsione meteo non disponibile in questo momento."}
            </p>
          ) : null}
        </div>
      )}
      {isCharter && fixedDurationDays && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900">
          {copy.selectedDuration}: {fixedDurationDays} {copy.days}
          {fixedEndDate ? `, ${copy.until} ${formatIsoDateLabel(fixedEndDate, locale)}` : ""}.
        </p>
      )}
      {isCharter && !fixedDurationDays && (
        <>
          <div className="flex items-center gap-3">
            <label
              htmlFor="wizard-end-date"
              className="w-8 shrink-0 text-right text-sm font-medium text-gray-600"
            >
              {copy.to}
            </label>
            <input
              id="wizard-end-date"
              type="date"
              required
              aria-required="true"
              value={endValue}
              onChange={(e) => onEndChange(e.target.value)}
              className="min-w-0 flex-1 px-4 py-3 rounded-lg border border-gray-300"
              min={endMin}
            />
          </div>
          {charterIsTooShort && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              {copy.charterTooShort}
            </p>
          )}
          {charterIsTooLong && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
              {copy.charterTooLong}
            </p>
          )}
        </>
      )}
      <button
        type="submit"
        disabled={!canContinue}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d97706] py-3 font-bold text-white disabled:opacity-50"
      >
        {copy.next}
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}

function PeopleStep({
  locale,
  capacityMax,
  serviceType,
  value,
  fareRules,
  selectedPrice,
  onChange,
  onBack,
  onNext,
  checking,
}: {
  locale: string;
  capacityMax: number;
  serviceType: string;
  value: PassengerBreakdown;
  fareRules: PassengerFareRuleConfig[];
  selectedPrice: SelectedPrice | null;
  onChange: (n: PassengerBreakdown) => void;
  onBack?: () => void;
  onNext: () => void;
  checking?: boolean;
}) {
  const copy = getPeopleStepCopy(locale);
  const seats = occupiedSeats(value, fareRules);
  const paidUnits = paidUnitsForClient(serviceType, value, selectedPrice, fareRules);
  const totalGuests = totalGuestCountFromBreakdown(value);
  const capacityExceeded = seats > capacityMax;
  const canSubmit = !checking && !capacityExceeded && seats >= 1;
  const estimatedTotal =
    selectedPrice && selectedPrice.pricingUnit === "PER_PACKAGE"
      ? selectedPrice.amount
      : selectedPrice
        ? selectedPrice.amount * paidUnits
        : null;
  const update = (key: keyof PassengerBreakdown, nextValue: number) => {
    onChange({
      ...value,
      [key]: Math.max(0, Math.min(50, nextValue)),
    });
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onNext();
      }}
    >
      <h2 className="text-2xl font-bold">{copy.title}</h2>
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {fareRules.filter((rule) => rule.active).map((rule) => {
          const field = PASSENGER_CATEGORY_FIELD[rule.category];
          return (
            <PassengerCounter
              key={rule.category}
              id={`wizard-${field}`}
              label={passengerRuleLabel(rule, locale)}
              hint={passengerRuleHint(rule, locale)}
              value={value[field]}
              min={0}
              icon={
                rule.category === "ADULT" || rule.category === "CHILD" ? (
                  <Users className="size-4" aria-hidden="true" />
                ) : (
                  <Baby className="size-4" aria-hidden="true" />
                )
              }
              onChange={(n) => update(field, n)}
              decrementText={copy.decrease}
              incrementText={copy.increase}
            />
          );
        })}
      </div>
      <div
        className={cnStep(
          "grid grid-cols-2 gap-3 rounded-lg border p-3 text-sm sm:grid-cols-3",
          capacityExceeded ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-700",
        )}
      >
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">{copy.seatsUsed}</div>
          <div className="font-bold tabular-nums">{seats} / {capacityMax}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">{copy.paidUnits}</div>
          <div className="font-bold tabular-nums">
            {paidUnits.toLocaleString(clientIntlLocale(locale))}
          </div>
        </div>
        <div className="col-span-2 sm:col-span-1">
          <div className="text-xs font-semibold uppercase text-slate-500">{copy.estimatedTotal}</div>
          <div className="font-bold tabular-nums">
            {estimatedTotal != null ? formatClientEurWithVat(estimatedTotal, locale) : copy.loading}
          </div>
        </div>
      </div>
      {totalGuests > 0 && (
        <p id="wizard-people-hint" className="text-sm text-gray-600">
          {copy.totalGuests}: {totalGuests}.
        </p>
      )}
      {capacityExceeded && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {copy.capacityExceeded}
        </p>
      )}
      <div className="flex flex-col gap-3 sm:flex-row">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={checking}
            className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-full border border-gray-300 py-3 font-semibold disabled:opacity-50"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {copy.back}
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-full bg-[#d97706] py-3 font-bold text-white disabled:opacity-50"
        >
          {checking ? copy.checking : copy.next}
          {!checking && <ChevronRight className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}

function PassengerCounter({
  id,
  label,
  hint,
  value,
  min,
  icon,
  onChange,
  decrementText = "Diminuisci",
  incrementText = "Aumenta",
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  icon: ReactNode;
  onChange: (n: number) => void;
  decrementText?: string;
  incrementText?: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-3 flex min-w-0 items-center gap-2">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          {icon}
        </span>
        <div className="min-w-0">
          <label htmlFor={id} className="block text-sm font-bold text-slate-950">
            {label}
          </label>
          <p className="text-xs leading-4 text-slate-500">{hint}</p>
        </div>
      </div>
      <div className="flex w-full min-w-0 items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-300 font-bold disabled:opacity-40 sm:size-11"
          aria-label={`${decrementText} ${label}`}
        >
          -
        </button>
        <input
          id={id}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "");
            onChange(digits ? Number.parseInt(digits, 10) : 0);
          }}
          className="h-10 w-0 min-w-0 flex-1 rounded-md border border-slate-300 text-center font-bold tabular-nums sm:h-11"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-300 font-bold sm:size-11"
          aria-label={`${incrementText} ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ReviewStep({
  locale,
  serviceName,
  serviceType,
  durationType,
  durationHours,
  startDate,
  endDate,
  durationDays,
  passengers,
  fareRules,
  customer,
  selectedPrice,
  paymentSchedule,
  depositPercentage,
  onPaymentScheduleChange,
  loading,
  onBack,
  onConfirm,
}: {
  locale: string;
  serviceName: string;
  serviceType: string;
  durationType: string;
  durationHours: number;
  startDate: string;
  endDate: string;
  durationDays?: number;
  passengers: PassengerBreakdown;
  fareRules: PassengerFareRuleConfig[];
  customer: Customer;
  selectedPrice: SelectedPrice | null;
  paymentSchedule: CheckoutPaymentSchedule;
  depositPercentage: number;
  onPaymentScheduleChange: (schedule: CheckoutPaymentSchedule) => void;
  loading: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const copy = getReviewStepCopy(locale);
  const totalAmount = estimateTotalAmount(serviceType, passengers, selectedPrice, fareRules);
  const payment = estimatePaymentBreakdown(totalAmount, paymentSchedule, depositPercentage);
  const seats = occupiedSeats(passengers, fareRules);
  const totalGuests = totalGuestCountFromBreakdown(passengers);
  const paidUnits = paidUnitsForClient(serviceType, passengers, selectedPrice, fareRules);
  const durationLabel =
    durationType === "MULTI_DAY" && durationDays
      ? `${durationDays} ${copy.days}`
      : durationHours >= 24
        ? `${Math.ceil(durationHours / 24)} ${copy.days}`
        : `${durationHours} ${copy.hours}`;
  const dateLabel =
    endDate && endDate !== startDate
      ? `${formatIsoDateLabel(startDate, locale)} - ${formatIsoDateLabel(endDate, locale)}`
      : formatIsoDateLabel(startDate, locale);
  const guestLabel = totalGuests === 1 ? copy.oneGuest : `${totalGuests} ${copy.guests}`;
  const customerName = `${customer.firstName} ${customer.lastName}`.trim();
  const paymentModeLabel =
    paymentSchedule === "DEPOSIT_BALANCE"
      ? locale === "es"
        ? `${depositPercentage}% de depósito`
        : locale === "fr"
          ? `${depositPercentage}% d'acompte`
        : locale === "en"
        ? `${depositPercentage}% deposit`
        : `Acconto ${depositPercentage}%`
      : copy.fullPayment;
  const paidUnitsLabel = paidUnits.toLocaleString(clientIntlLocale(locale));
  const showGuestBreakdown = fareRules.some(
    (rule) => rule.active && passengers[PASSENGER_CATEGORY_FIELD[rule.category]] > 0,
  );
  const guestAccountingDetails = [
    seats !== totalGuests ? `${copy.seatsUsed}: ${seats}` : null,
    Math.abs(paidUnits - seats) > 0.001 ? `${copy.paidUnits}: ${paidUnitsLabel}` : null,
  ].filter(Boolean);

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (payment && !loading) onConfirm();
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
          {copy.eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-bold">{copy.title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {copy.subtitle}
        </p>
      </div>

      <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <legend className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
          {copy.paymentQuestion}
        </legend>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <PaymentChoiceCard
            checked={paymentSchedule === "DEPOSIT_BALANCE"}
            title={
              locale === "es"
                ? `${depositPercentage}% de depósito`
                : locale === "fr"
                  ? `${depositPercentage}% d'acompte`
                : locale === "en"
                  ? `${depositPercentage}% deposit`
                  : `Acconto ${depositPercentage}%`
            }
            badge={copy.recommended}
            description={copy.depositDescription}
            amount={
              payment
                ? appendClientVatIncluded(
                    formatClientCents(
                      Math.round((payment.totalCents * depositPercentage) / 100),
                      locale,
                    ),
                    locale,
                  )
                : copy.calculating
            }
            onChange={() => onPaymentScheduleChange("DEPOSIT_BALANCE")}
          />
          <PaymentChoiceCard
            checked={paymentSchedule === "FULL"}
            title={copy.fullPayment}
            description={copy.fullPaymentDescription}
            amount={
              payment
                ? appendClientVatIncluded(formatClientCents(payment.totalCents, locale), locale)
                : copy.calculating
            }
            onChange={() => onPaymentScheduleChange("FULL")}
          />
        </div>
        {paymentSchedule === "DEPOSIT_BALANCE" && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            {copy.depositNote}
          </p>
        )}
      </fieldset>

      <div className="rounded-lg border border-slate-200 bg-white p-4 sm:p-5">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-sky-700">
              {copy.summary}
            </p>
            <h3 className="mt-1 break-words text-xl font-heading font-bold text-slate-950">
              {serviceName}
            </h3>
          </div>
          <span className="inline-flex w-fit rounded-full bg-sky-100 px-3 py-1 text-xs font-bold text-sky-800">
            {paymentModeLabel}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-slate-200 py-4 sm:grid-cols-3">
          <SummaryMetric label={copy.date} value={dateLabel} />
          <SummaryMetric label={copy.duration} value={durationLabel} />
          <SummaryMetric label={copy.guestsLabel} value={guestLabel} />
        </div>

        {(showGuestBreakdown || guestAccountingDetails.length > 0) && (
          <div className="border-b border-slate-200 py-3">
            {showGuestBreakdown && (
              <div className="flex flex-wrap gap-2">
                {fareRules.filter((rule) => rule.active).map((rule) => {
                  const value = passengers[PASSENGER_CATEGORY_FIELD[rule.category]];
                  return value > 0 ? (
                    <SummaryPill
                      key={rule.category}
                      label={passengerRuleLabel(rule, locale)}
                      value={value}
                    />
                  ) : null;
                })}
              </div>
            )}
            {guestAccountingDetails.length > 0 && (
              <p className="mt-2 text-xs font-medium text-slate-500">
                {guestAccountingDetails.join(" · ")}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-x-5 gap-y-4 border-b border-slate-200 py-4">
          <SummaryMetric label={copy.customer} value={customerName} />
          <SummaryMetric label={copy.phone} value={customer.phone} />
          <div className="col-span-2">
            <SummaryMetric label="Email" value={customer.email} />
          </div>
        </div>

        <div className="pt-4">
          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            {copy.payment}
          </h4>
          {payment ? (
            <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-4 sm:grid-cols-3">
              <SummaryMetric
                label={copy.total}
                value={appendClientVatIncluded(formatClientCents(payment.totalCents, locale), locale)}
                strong
              />
              <SummaryMetric
                label={
                  paymentSchedule === "DEPOSIT_BALANCE"
                    ? `${copy.now} (${payment.depositPercentage}%)`
                    : copy.now
                }
                value={appendClientVatIncluded(formatClientCents(payment.upfrontCents, locale), locale)}
                strong
                highlight
              />
              <div className="col-span-2 sm:col-span-1">
                <SummaryMetric
                  label={copy.balanceOnSite}
                  value={
                    payment.balanceCents > 0
                      ? appendClientVatIncluded(formatClientCents(payment.balanceCents, locale), locale)
                      : "-"
                  }
                />
              </div>
            </div>
          ) : (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              {copy.priceUnavailable}
            </p>
          )}
        </div>
      </div>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
        {copy.serverRecalculationNote}
      </p>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-3 text-center font-semibold disabled:opacity-50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {copy.editDetails}
        </button>
        <button
          type="submit"
          disabled={!payment || loading}
          className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-full bg-[#d97706] px-4 py-3 text-center font-bold text-white disabled:opacity-50"
        >
          {loading ? copy.creatingPayment : copy.confirmAndPay}
          {!loading && <CreditCard className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}

function PaymentChoiceCard({
  checked,
  title,
  badge,
  description,
  amount,
  onChange,
}: {
  checked: boolean;
  title: string;
  badge?: string;
  description: string;
  amount: string;
  onChange: () => void;
}) {
  return (
    <label
      className={cnStep(
        "flex min-w-0 cursor-pointer items-start gap-3 rounded-lg border bg-white p-4 transition",
        checked ? "border-sky-500 ring-2 ring-sky-100" : "border-slate-200 hover:border-sky-200",
      )}
    >
      <input
        type="radio"
        name="checkout-payment-schedule"
        checked={checked}
        onChange={onChange}
        className="mt-1 size-4 shrink-0"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-2">
          <span className="font-bold text-slate-950">{title}</span>
          {badge && (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.08em] text-emerald-700">
              {badge}
            </span>
          )}
        </span>
        <span className="mt-1 block text-sm text-slate-600">{description}</span>
        <span className="mt-3 block break-words text-base font-bold text-slate-950 sm:text-lg">
          {amount}
        </span>
      </span>
    </label>
  );
}

function SummaryMetric({
  label,
  value,
  strong,
  highlight,
}: {
  label: string;
  value: string;
  strong?: boolean;
  highlight?: boolean;
}) {
  return (
    <div
      className={cnStep(
        "min-w-0 border-l-2 pl-3",
        highlight ? "border-sky-500" : "border-slate-200",
      )}
    >
      <p
        className={cnStep(
          "text-[11px] font-bold uppercase tracking-[0.1em]",
          highlight ? "text-sky-700" : "text-slate-500",
        )}
      >
        {label}
      </p>
      <p
        className={cnStep(
          "mt-1 break-words text-sm",
          highlight ? "text-sky-950" : "text-slate-950",
          strong ? "font-bold" : "font-semibold",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function SummaryPill({ label, value }: { label: string; value: number }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
      <span>{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </span>
  );
}

function PhoneCountrySelect({
  locale,
  country,
  onChange,
}: {
  locale: string;
  country: PhoneCountry;
  onChange: (country: PhoneCountry) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [dropdownPosition, setDropdownPosition] =
    useState<PhoneCountryDropdownPosition | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const filteredCountries = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("it-IT");
    if (!normalizedQuery) return PHONE_COUNTRIES;
    return PHONE_COUNTRIES.filter((phoneCountry) =>
      phoneCountry.searchLabel.includes(normalizedQuery),
    );
  }, [query]);

  function updateDropdownPosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const viewportPadding = 8;
    const width = Math.min(
      PHONE_COUNTRY_DROPDOWN_WIDTH,
      window.innerWidth - viewportPadding * 2,
    );
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openAbove = spaceBelow < 260 && spaceAbove > spaceBelow;
    const availableHeight = openAbove ? spaceAbove : spaceBelow;
    const maxHeight = Math.min(320, Math.max(140, availableHeight));
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      window.innerWidth - width - viewportPadding,
    );
    const top = openAbove
      ? Math.max(viewportPadding, rect.top - maxHeight - 4)
      : Math.min(rect.bottom + 4, window.innerHeight - maxHeight - viewportPadding);

    setDropdownPosition({ top, left, width, maxHeight });
  }

  useEffect(() => {
    if (!open) return;

    updateDropdownPosition();

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updateDropdownPosition);
    window.addEventListener("scroll", updateDropdownPosition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updateDropdownPosition);
      window.removeEventListener("scroll", updateDropdownPosition, true);
    };
  }, [open]);

  function selectCountry(nextCountry: PhoneCountry) {
    onChange(nextCountry);
    setOpen(false);
    setQuery("");
  }

  return (
    <div ref={rootRef} className="relative min-w-0 border-r border-gray-200 bg-slate-50">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={locale === "es" ? "Prefijo telefónico" : locale === "fr" ? "Indicatif téléphonique" : locale === "en" ? "Phone country code" : "Prefisso telefonico"}
        onClick={() => {
          if (!open) updateDropdownPosition();
          setOpen((current) => !current);
        }}
        className="flex h-full w-full min-w-0 items-center justify-center gap-2 px-3 py-3 text-sm font-semibold text-slate-800 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-[var(--color-gold)]/45"
      >
        <CountryFlag code={country.flagCode} className="h-4 w-6" />
        <span className="tabular-nums">{country.dialCode}</span>
        <ChevronDown className="h-4 w-4 text-slate-500" aria-hidden="true" />
        <span className="sr-only">{country.label}</span>
      </button>

      {open && dropdownPosition && (
        <div
          className="fixed z-[100] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl shadow-slate-900/15"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            maxHeight: dropdownPosition.maxHeight,
          }}
        >
          <div className="border-b border-slate-100 p-2">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={locale === "es" ? "Buscar" : locale === "fr" ? "Rechercher" : locale === "en" ? "Search" : "Cerca"}
              aria-label={locale === "es" ? "Buscar prefijo" : locale === "fr" ? "Rechercher un indicatif" : locale === "en" ? "Search country code" : "Cerca prefisso"}
              className="w-full rounded-md border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-sky-500"
            />
          </div>
          <div
            role="listbox"
            className="overflow-y-auto p-1"
            style={{
              maxHeight: Math.max(
                80,
                dropdownPosition.maxHeight - PHONE_COUNTRY_DROPDOWN_SEARCH_HEIGHT,
              ),
            }}
          >
            {filteredCountries.map((phoneCountry) => {
              const selected = phoneCountry.code === country.code;
              return (
                <button
                  key={phoneCountry.code}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  title={`${phoneCountry.label} ${phoneCountry.dialCode}`}
                  onClick={() => selectCountry(phoneCountry)}
                  className={cnStep(
                    "flex w-full items-center justify-center gap-3 rounded-md px-3 py-2 text-sm font-semibold transition",
                    selected ? "bg-sky-50 text-sky-900" : "text-slate-800 hover:bg-slate-50",
                  )}
                >
                  <CountryFlag code={phoneCountry.flagCode} className="h-4 w-6" />
                  <span className="tabular-nums">{phoneCountry.dialCode}</span>
                  <span className="sr-only">{phoneCountry.label}</span>
                </button>
              );
            })}
            {filteredCountries.length === 0 && (
              <p className="px-3 py-3 text-center text-sm text-slate-500">
                {locale === "es" ? "No se ha encontrado ningún prefijo" : locale === "fr" ? "Aucun indicatif trouvé" : locale === "en" ? "No code found" : "Nessun prefisso trovato"}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function PhoneNumberField({
  locale,
  value,
  onChange,
  label,
}: {
  locale: string;
  value: string;
  onChange: (phone: string) => void;
  label: string;
}) {
  const country = selectedPhoneCountry(value, locale);
  const nationalNumber = stripDialCode(value, country);

  function handleCountryChange(countryCode: string) {
    const nextCountry = countryByCode(countryCode);
    onChange(composePhone(nextCountry.dialCode, nationalNumber));
  }

  function handleNumberChange(nextValue: string) {
    if (nextValue.trim().startsWith("+")) {
      onChange(nextValue);
      return;
    }
    onChange(composePhone(country.dialCode, nextValue));
  }

  return (
    <div>
      <label htmlFor="wizard-phone" className="block text-sm font-medium mb-1">
        {label}
      </label>
      <div className="grid grid-cols-[minmax(7.25rem,8.5rem)_minmax(0,1fr)] rounded-lg border border-gray-300 bg-white focus-within:ring-2 focus-within:ring-[var(--color-gold)]/45">
        <PhoneCountrySelect
          locale={locale}
          country={country}
          onChange={(nextCountry) => handleCountryChange(nextCountry.code)}
        />
        <input
          id="wizard-phone"
          type="tel"
          required
          aria-required="true"
          autoComplete="tel-national"
          inputMode="tel"
          placeholder={locale === "es" ? "612 345 678" : locale === "fr" ? "6 12 34 56 78" : locale === "en" ? "7123 456789" : "333 123 4567"}
          className="min-w-0 px-4 py-3 outline-none"
          value={nationalNumber}
          onChange={(event) => handleNumberChange(event.target.value)}
        />
      </div>
    </div>
  );
}

function CustomerStep({
  locale,
  value,
  onChange,
  onBack,
  onNext,
  loading,
  turnstileSiteKey,
  turnstileResetKey,
  onTurnstileToken,
  onTurnstileExpired,
  consentPrivacy,
  consentTerms,
  onConsentPrivacyChange,
  onConsentTermsChange,
}: {
  locale: string;
  value: Customer;
  onChange: (v: Customer) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
  turnstileSiteKey: string;
  turnstileResetKey: number;
  onTurnstileToken: (token: string) => void;
  onTurnstileExpired: () => void;
  consentPrivacy: boolean;
  consentTerms: boolean;
  onConsentPrivacyChange: (v: boolean) => void;
  onConsentTermsChange: (v: boolean) => void;
}) {
  const copy = getCustomerStepCopy(locale);
  const valid = Boolean(
    value.email.trim() &&
      value.firstName.trim() &&
      value.lastName.trim() &&
      hasNationalPhoneNumber(value.phone, locale),
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !loading && consentPrivacy && consentTerms) onNext();
      }}
    >
      <h2 className="text-2xl font-bold">{copy.title}</h2>
      {/* R19 WCAG 3.3.2 label visibility: placeholder-as-label era
           non-conforme (scompare al focus, screen reader incerto su quale
           campo). Ora label esplicita + aria-required. EAA 2025 blocker
           per settore turismo. */}
      <div>
        <label htmlFor="wizard-email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          id="wizard-email"
          type="email"
          placeholder={locale === "es" ? "tu@ejemplo.com" : locale === "fr" ? "vous@exemple.fr" : locale === "en" ? "you@example.com" : "mario@esempio.it"}
          required
          aria-required="true"
          autoComplete="email"
          className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-3"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="wizard-first-name" className="block text-sm font-medium mb-1">
            {copy.firstName}
          </label>
          <input
            id="wizard-first-name"
            type="text"
            required
            aria-required="true"
            autoComplete="given-name"
            className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-3"
            value={value.firstName}
            onChange={(e) => onChange({ ...value, firstName: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="wizard-last-name" className="block text-sm font-medium mb-1">
            {copy.lastName}
          </label>
          <input
            id="wizard-last-name"
            type="text"
            required
            aria-required="true"
            autoComplete="family-name"
            className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-3"
            value={value.lastName}
            onChange={(e) => onChange({ ...value, lastName: e.target.value })}
          />
        </div>
      </div>
      <PhoneNumberField
        locale={locale}
        label={copy.phone}
        value={value.phone}
        onChange={(phone) => onChange({ ...value, phone })}
      />
      {turnstileSiteKey && (
        <div className="max-w-full overflow-x-auto pb-1">
          <TurnstileWidget
            // R26-A1-C2: key cambia su onRetryNeeded → remount forzato →
            // widget re-challenge Cloudflare (evita token stale post-cardDeclined).
            key={turnstileResetKey}
            siteKey={turnstileSiteKey}
            onToken={onTurnstileToken}
            onExpired={onTurnstileExpired}
          />
        </div>
      )}

      <div className="space-y-2 text-sm border-t pt-4">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consentPrivacy}
            onChange={(e) => onConsentPrivacyChange(e.target.checked)}
            className="mt-1 size-4 shrink-0"
            required
          />
          <span className="min-w-0 leading-6">
            {copy.privacyPrefix}{" "}
            <a
              href={locale === "es" ? "/es/privacidad" : locale === "fr" ? "/fr/confidentialite" : `/${locale}/privacy`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Privacy Policy
            </a>
            . *
          </span>
        </label>
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consentTerms}
            onChange={(e) => onConsentTermsChange(e.target.checked)}
            className="mt-1 size-4 shrink-0"
            required
          />
          <span className="min-w-0 leading-6">
            {copy.termsPrefix}{" "}
            <a
              href={locale === "es" ? "/es/terminos-y-condiciones" : locale === "fr" ? "/fr/conditions-generales" : `/${locale}/terms`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {copy.terms}
            </a>{" "}
            {copy.termsSuffix} *
          </span>
        </label>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-3 text-center font-semibold disabled:opacity-50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {copy.back}
        </button>
        <button
          type="submit"
          disabled={!valid || loading || !consentPrivacy || !consentTerms}
          className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-full bg-[#d97706] px-4 py-3 text-center font-bold text-white disabled:opacity-50"
        >
          {loading ? copy.wait : copy.continueToPayment}
          {!loading && <CreditCard className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}
