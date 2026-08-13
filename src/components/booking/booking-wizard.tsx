"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Baby, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, CreditCard, ReceiptText, UserRound, Users } from "lucide-react";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import { StripePaymentForm } from "./stripe-payment-form";
import { CountryFlag, type FlagCode } from "@/components/country-flag";
import { TurnstileWidget } from "@/components/turnstile/turnstile-widget";
import { centsToAnalyticsValue, trackEvent, trackEventOncePerSession } from "@/lib/analytics/client";
import { CURRENT_POLICY_VERSION } from "@/lib/legal/policy-version";
import { PUBLIC_CONTACT_EMAIL } from "@/lib/public-contact";
import { checkOverrideEligibilityAction } from "@/lib/booking/override-check-action";
import { resolveCalendarDateSelection } from "@/lib/booking/calendar-selection";
import {
  DEFAULT_PASSENGER_FARE_CATEGORIES,
  PASSENGER_FARE_SERVICE_TYPE,
  estimatePaidUnitEquivalent,
  estimatePassengerFareTotal,
  occupiedSeatCountForPassengerCategories,
  totalGuestCountFromBreakdown,
  type PassengerFareCategory,
  type PassengerFareCategoryPriceConfig,
  type PassengerFareCategoryConfig,
} from "@/lib/pricing/passenger-fare-rules-shared";
import type { PrivateBillingDetails } from "@/lib/booking/billing-details";

type Step = "date" | "customer" | "review" | "payment" | "success";
type PersistedStep = Step | "people";
type AnalyticsStep = Step | "people";
type CheckoutPaymentSchedule = "FULL" | "DEPOSIT_BALANCE";

const CHECKOUT_STEPS: Array<{
  key: Exclude<Step, "success">;
  label: string;
  icon: typeof CalendarDays;
}> = [
  { key: "date", label: "Data e ospiti", icon: CalendarDays },
  { key: "customer", label: "Dati", icon: UserRound },
  { key: "review", label: "Riepilogo", icon: ReceiptText },
  { key: "payment", label: "Pagamento", icon: CreditCard },
];

const CHECKOUT_STEPS_EN: typeof CHECKOUT_STEPS = [
  { key: "date", label: "Date & guests", icon: CalendarDays },
  { key: "customer", label: "Details", icon: UserRound },
  { key: "review", label: "Summary", icon: ReceiptText },
  { key: "payment", label: "Payment", icon: CreditCard },
];

const CHECKOUT_STEPS_ES: typeof CHECKOUT_STEPS = [
  { key: "date", label: "Fecha y huéspedes", icon: CalendarDays },
  { key: "customer", label: "Datos", icon: UserRound },
  { key: "review", label: "Resumen", icon: ReceiptText },
  { key: "payment", label: "Pago", icon: CreditCard },
];

const CHECKOUT_STEPS_FR: typeof CHECKOUT_STEPS = [
  { key: "date", label: "Date et invités", icon: CalendarDays },
  { key: "customer", label: "Coordonnées", icon: UserRound },
  { key: "review", label: "Résumé", icon: ReceiptText },
  { key: "payment", label: "Paiement", icon: CreditCard },
];

const CHECKOUT_STEPS_DE: typeof CHECKOUT_STEPS = [
  { key: "date", label: "Datum & Gäste", icon: CalendarDays },
  { key: "customer", label: "Daten", icon: UserRound },
  { key: "review", label: "Übersicht", icon: ReceiptText },
  { key: "payment", label: "Zahlung", icon: CreditCard },
];

function analyticsStepNumber(step: AnalyticsStep): number {
  if (step === "date") return 1;
  if (step === "people") return 2;
  if (step === "customer") return 3;
  if (step === "review") return 4;
  if (step === "payment") return 5;
  return 6;
}

function clientIntlLocale(locale?: string | null): string {
  if (locale === "es") return "es-ES";
  if (locale === "fr") return "fr-FR";
  if (locale === "de") return "de-DE";
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
  step: PersistedStep;
  startDate: string;
  endDate: string;
  durationDays: number;
  numPeople?: number;
  passengers?: PassengerBreakdown;
  paymentSchedule?: CheckoutPaymentSchedule;
  customer: Customer;
  billingDetails: PrivateBillingDetails;
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

function contactPath(locale: string): string {
  if (locale === "en") return "/en/contact";
  if (locale === "es") return "/es/contacto";
  if (locale === "fr") return "/fr/contact";
  if (locale === "de") return "/de/kontakt";
  return "/it/contatti";
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
  onBackToSelection?: () => void;
  constrainHeight?: boolean;
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
  return locale === "es" ? "ES" : locale === "fr" ? "FR" : locale === "de" ? "DE" : locale === "en" ? "GB" : "IT";
}

type CountryOption = { code: string; label: string };

function localizedCountryOptions(locale: string): CountryOption[] {
  const displayNames = new Intl.DisplayNames([clientIntlLocale(locale)], { type: "region" });
  return getCountries()
    .map((code) => ({ code, label: displayNames.of(code) ?? code }))
    .sort((left, right) => left.label.localeCompare(right.label, clientIntlLocale(locale)));
}

function localizedCountryName(code: string, locale: string): string {
  return new Intl.DisplayNames([clientIntlLocale(locale)], { type: "region" }).of(code) ?? code;
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
  infants: number;
}

const PASSENGER_CATEGORY_FIELD: Record<PassengerFareCategory, keyof PassengerBreakdown> = {
  ADULT: "adults",
  CHILD: "children",
  INFANT: "infants",
};

interface SelectedPrice {
  amount: number;
  pricingUnit: string;
  passengerCategoryPrices?: PassengerFareCategoryPriceConfig[] | null;
}

function passengerCategoryPricesEqual(
  left?: PassengerFareCategoryPriceConfig[] | null,
  right?: PassengerFareCategoryPriceConfig[] | null,
): boolean {
  const leftPrices = left ?? [];
  const rightPrices = right ?? [];
  if (leftPrices.length !== rightPrices.length) return false;
  return leftPrices.every((price, index) => {
    const other = rightPrices[index];
    return other?.category === price.category && other.amount === price.amount;
  });
}

function defaultPassengers(): PassengerBreakdown {
  return { adults: 1, children: 0, infants: 0 };
}

function occupiedSeats(passengers: PassengerBreakdown): number {
  return occupiedSeatCountForPassengerCategories(passengers);
}

function paidUnitsForClient(
  serviceType: string,
  passengers: PassengerBreakdown,
  selectedPrice: SelectedPrice | null,
): number {
  return estimatePaidUnitEquivalent({
    serviceType,
    pricingUnit: selectedPrice?.pricingUnit ?? "PER_PERSON",
    unitPrice: selectedPrice?.amount ?? 1,
    passengers,
    categoryPrices: selectedPrice?.passengerCategoryPrices ?? null,
  });
}

function passengerCategoryUnitPrice(
  rule: PassengerFareCategoryConfig,
  serviceType: string,
  selectedPrice: SelectedPrice | null,
): number | null {
  if (!selectedPrice || selectedPrice.pricingUnit === "PER_PACKAGE") return null;

  const categoryPrice = selectedPrice.passengerCategoryPrices?.find(
    (price) => price.category === rule.category,
  );
  if (categoryPrice && Number.isFinite(categoryPrice.amount)) {
    return Math.max(0, categoryPrice.amount);
  }

  if (serviceType !== PASSENGER_FARE_SERVICE_TYPE) {
    return rule.occupiesSeat ? selectedPrice.amount : 0;
  }

  if (rule.pricingMode === "FIXED") return Math.max(0, rule.fixedAmount ?? 0);
  return Math.max(0, selectedPrice.amount * rule.multiplier);
}

function formatClientEur(amount: number, locale?: string | null): string {
  return new Intl.NumberFormat(clientIntlLocale(locale), {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function clientVatIncludedLabel(locale: string): string {
  return locale === "es"
    ? "IVA incluido"
    : locale === "fr"
      ? "TVA incluse"
      : locale === "de"
        ? "inkl. MwSt."
        : locale === "en"
          ? "VAT included"
          : "IVA inclusa";
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
): number | null {
  if (!selectedPrice) return null;
  return estimatePassengerFareTotal({
    serviceType,
    pricingUnit: selectedPrice.pricingUnit,
    unitPrice: selectedPrice.amount,
    passengers,
    categoryPrices: selectedPrice.passengerCategoryPrices ?? null,
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
    nationality: defaultPhoneCountryCode(props.locale),
    language: "it",
  });
  const [billingDetails, setBillingDetails] = useState<PrivateBillingDetails>({
    taxId: "",
    addressLine1: "",
    addressLine2: "",
    city: "",
    province: "",
    postalCode: "",
    countryCode: defaultPhoneCountryCode(props.locale),
  });
  const [intent, setIntent] = useState<{
    confirmationCode: string;
    analyticsTransactionId?: string;
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
  const passengerCategories = DEFAULT_PASSENGER_FARE_CATEGORIES;
  const charterDurationDays = isCharter ? inclusiveDaysBetween(startDate, endDate) : null;
  const selectedCharterDurationDays = fixedDurationDays ?? charterDurationDays ?? undefined;
  const effectiveDurationDays = isCharter
    ? selectedCharterDurationDays ?? durationDays
    : durationDays;
  const priceLookupDurationDays =
    isCharter &&
    selectedCharterDurationDays !== undefined &&
    selectedCharterDurationDays >= 3 &&
    selectedCharterDurationDays <= 7
      ? selectedCharterDurationDays
      : undefined;
  const canContinueFromDate =
    !isCharter ||
    (Boolean(fixedDurationDays) && Boolean(startDate)) ||
    (charterDurationDays !== null && charterDurationDays >= 3 && charterDurationDays <= 7);
  const isCustomerStep = step === "customer";
  const showWizardHeader = step !== "date" && !isCustomerStep;

  const analyticsServiceParams = useMemo(
    () => ({
      locale: props.locale,
      service_id: props.serviceId,
      service_name: props.serviceName,
      service_type: props.serviceType,
      duration_type: props.durationType,
    }),
    [props.durationType, props.locale, props.serviceId, props.serviceName, props.serviceType],
  );

  function trackBookingStepComplete(
    completedStep: AnalyticsStep,
    extra: Record<string, unknown> = {},
  ) {
    trackEvent("booking_step_complete", {
      ...analyticsServiceParams,
      booking_step: completedStep,
      step: completedStep,
      step_number: analyticsStepNumber(completedStep),
      ...extra,
    });
  }

  const showWizardBack = step !== "success" && (step !== "date" || Boolean(props.onBackToSelection));

  function goBackWithinWizard() {
    if (loading) return;
    setError(null);
    if (step === "date") {
      props.onBackToSelection?.();
      return;
    }
    if (step === "customer") {
      setStep("date");
      return;
    }
    if (step === "review") {
      setStep("customer");
      return;
    }
    if (step === "payment") {
      setIntent(null);
      setTurnstileToken(null);
      setTurnstileResetKey((key) => key + 1);
      setStep("review");
    }
  }

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
      if (d.step === "people" || d.step === "date") {
        setStep("date");
      } else if (d.step === "customer" || d.step === "review") {
        setStep("customer");
      }
      if (typeof d.startDate === "string") setStartDate(d.startDate);
      if (typeof d.endDate === "string") setEndDate(d.endDate);
      if (typeof d.durationDays === "number") setDurationDays(d.durationDays);
      if (d.passengers && typeof d.passengers === "object") {
        setPassengers((prev) => ({ ...prev, ...d.passengers }));
      } else if (typeof d.numPeople === "number") {
        setPassengers({ adults: Math.max(1, d.numPeople), children: 0, infants: 0 });
      }
      if (d.paymentSchedule === "FULL" || d.paymentSchedule === "DEPOSIT_BALANCE") {
        setSelectedPaymentSchedule(d.paymentSchedule);
      }
      if (d.customer && typeof d.customer === "object") {
        setCustomer((prev) => ({ ...prev, ...d.customer }));
      }
      if (d.billingDetails && typeof d.billingDetails === "object") {
        setBillingDetails((prev) => ({ ...prev, ...d.billingDetails }));
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
      billingDetails,
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
    billingDetails,
  ]);

  useEffect(() => {
    if (!hydrated) return;
    trackEventOncePerSession(
      "booking-start:" + props.serviceId,
      "booking_start",
      analyticsServiceParams,
    );
  }, [analyticsServiceParams, hydrated, props.serviceId]);

  useEffect(() => {
    if (!hydrated) return;
    trackEventOncePerSession(
      "booking-step:" + props.serviceId + ":" + step,
      "booking_step_view",
      {
        ...analyticsServiceParams,
        booking_step: step,
        step,
        step_number: analyticsStepNumber(step),
      },
    );
  }, [analyticsServiceParams, hydrated, props.serviceId, step]);

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
            passengerCategoryPrices: day.passengerCategoryPrices ?? null,
          };
          setSelectedPrice((current) =>
            current?.amount === nextPrice.amount &&
            current.pricingUnit === nextPrice.pricingUnit &&
            passengerCategoryPricesEqual(current.passengerCategoryPrices, nextPrice.passengerCategoryPrices)
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

  async function createIntent(paymentScheduleOverride = selectedPaymentSchedule) {
    const paymentSchedule = paymentScheduleOverride;
    setError(null);
    if (!consentPrivacy || !consentTerms) {
      trackEvent("form_error", {
        ...analyticsServiceParams,
        booking_step: "review",
        error_code: "privacy_terms_missing",
      });
      setError(copy.acceptPolicies);
      return;
    }
    // In prod il server richiede Turnstile token (enforce). In dev passa senza.
    if (props.turnstileSiteKey && !turnstileToken) {
      trackEvent("form_error", {
        ...analyticsServiceParams,
        booking_step: "review",
        error_code: "captcha_missing",
      });
      setError(copy.completeCaptcha);
      return;
    }
    setLoading(true);
    trackBookingStepComplete("review", { payment_schedule: paymentSchedule });
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
          billingDetails,
          paymentSchedule,
          depositPercentage:
            paymentSchedule === "DEPOSIT_BALANCE"
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
          trackEvent("availability_unavailable", {
            ...analyticsServiceParams,
            booking_step: "review",
            error_code: "dates_no_longer_available",
            status_code: res.status,
          });
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
      const checkoutAmountCents = Number(payload.amountCents ?? 0);
      const checkoutTotalCents = Number(payload.totalCents ?? payload.amountCents ?? 0);
      const checkoutGuestCount = occupiedSeats(passengers);
      trackEvent("begin_checkout", {
        ...analyticsServiceParams,
        currency: "EUR",
        value: centsToAnalyticsValue(checkoutAmountCents),
        total_value: centsToAnalyticsValue(checkoutTotalCents),
        payment_schedule: paymentSchedule,
        guest_count: checkoutGuestCount,
        items: [
          {
            item_id: props.serviceId,
            item_name: props.serviceName,
            item_category: props.serviceType,
            quantity: Math.max(1, checkoutGuestCount),
            price: centsToAnalyticsValue(checkoutTotalCents),
          },
        ],
      });
      if (props.useStripeCheckout) {
        if (!payload.checkoutUrl || typeof payload.checkoutUrl !== "string") {
          throw new Error(copy.stripeCheckoutUnavailable);
        }
        window.location.assign(payload.checkoutUrl);
        return;
      }
      setIntent({
        confirmationCode: payload.confirmationCode,
        analyticsTransactionId: typeof payload.analyticsTransactionId === "string" ? payload.analyticsTransactionId : undefined,
        clientSecret: payload.clientSecret,
        amountCents: payload.amountCents,
        totalCents: payload.totalCents,
        balanceCents: payload.balanceCents ?? 0,
      });
      setStep("payment");
    } catch (err) {
      trackEvent("booking_error", {
        ...analyticsServiceParams,
        booking_step: "review",
        error_code: err instanceof Error ? "booking_create_failed" : "unknown",
      });
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function advanceFromDateAndPassengers() {
    trackBookingStepComplete("date", {
      selected_date: startDate,
      end_date: endDate || undefined,
      duration_days: effectiveDurationDays,
    });
    trackBookingStepComplete("people", {
      guest_count: occupiedSeats(passengers),
      total_guests: totalGuestCountFromBreakdown(passengers),
    });
    setStep("customer");
  }

  async function handleContinueFromDateAndPassengers() {
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
        numPax: occupiedSeats(passengers),
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
          advanceFromDateAndPassengers();
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
      advanceFromDateAndPassengers();
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
    <div
      className={cnStep(
        "flex h-fit w-full min-w-0 max-w-full flex-col overflow-visible rounded-lg border border-white/20 bg-white shadow-2xl shadow-black/20",
        props.constrainHeight && "lg:h-full lg:max-h-full lg:overflow-hidden",
      )}
    >
      {showWizardHeader && (
        <div className="shrink-0 border-b border-white/10 bg-[linear-gradient(135deg,#071934_0%,#0c3d5e_100%)] px-4 py-3 text-white sm:px-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex min-w-0 items-center gap-3">
              {showWizardBack && (
                <button
                  type="button"
                  onClick={goBackWithinWizard}
                  disabled={loading}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/18 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  <span>{copy.back}</span>
                </button>
              )}
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sky-100 sm:text-xs">
                  {copy.directCheckout}
                </p>
                <h3 className="mt-1 truncate font-heading text-lg font-bold text-white sm:text-2xl">
                  {props.serviceName}
                </h3>
              </div>
            </div>
            <StepIndicator step={step} locale={props.locale} />
          </div>
        </div>
      )}

      <div
        className={cnStep(
          "min-h-0 w-full overflow-visible",
          props.constrainHeight && "lg:flex lg:flex-1 lg:flex-col lg:overflow-y-auto",
          showWizardHeader ? "p-3 sm:p-5" : "p-2 sm:p-3",
        )}
      >
      {error && (
        <div
          role="alert"
          aria-live="assertive"
          className="mb-5 shrink-0 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
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
            serviceType={props.serviceType}
            capacityMax={props.capacityMax}
            passengers={passengers}
            passengerCategories={passengerCategories}
            onChange={(value) => {
              setOverrideCheck({ status: "idle" });
              setStartDate(value);
              if (value) {
                trackEvent("date_selected", {
                  ...analyticsServiceParams,
                  booking_step: "date",
                  selected_date: value,
                  duration_days: fixedDurationDays ?? effectiveDurationDays,
                });
              }
              if (value && fixedDurationDays) {
                setEndDate(addIsoDays(value, fixedDurationDays - 1));
              } else if (endDate && value && endDate < addIsoDays(value, 2)) {
                setEndDate("");
              }
            }}
            onEndChange={(value) => {
              setOverrideCheck({ status: "idle" });
              setEndDate(value);
              if (value) {
                trackEvent("date_selected", {
                  ...analyticsServiceParams,
                  booking_step: "date",
                  selected_date: startDate,
                  end_date: value,
                  duration_days: inclusiveDaysBetween(startDate, value) ?? effectiveDurationDays,
                });
              }
            }}
            onPassengersChange={(nextPassengers) => {
              setOverrideCheck({ status: "idle" });
              setPassengers(nextPassengers);
              trackEvent("guest_count_selected", {
                ...analyticsServiceParams,
                booking_step: "people",
                guest_count: occupiedSeats(nextPassengers),
                total_guests: totalGuestCountFromBreakdown(nextPassengers),
              });
            }}
            onNext={() => void handleContinueFromDateAndPassengers()}
            onBack={props.onBackToSelection ? goBackWithinWizard : undefined}
            backLabel={copy.back}
            canContinue={Boolean(startDate) && canContinueFromDate}
            selectedPrice={selectedPrice}
            onPriceChange={setSelectedPrice}
            checking={overrideCheck.status === "checking"}
            overrideMessage={
              overrideCheck.status === "blocked" ? overrideCheck.message : undefined
            }
            fillAvailableHeight={Boolean(props.constrainHeight)}
          />
        </>
      )}

      {step === "customer" && (
          <CustomerStep
            locale={props.locale}
            value={customer}
            onChange={setCustomer}
            billingDetails={billingDetails}
            onBillingDetailsChange={setBillingDetails}
            onBack={goBackWithinWizard}
            onNext={() => {
              trackBookingStepComplete("customer");
              setStep("review");
          }}
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
          passengerCategories={passengerCategories}
          customer={customer}
          billingDetails={billingDetails}
          selectedPrice={selectedPrice}
          paymentSchedule={selectedPaymentSchedule}
          depositPercentage={props.defaultDepositPercentage ?? 30}
          onPaymentScheduleChange={(schedule, submit) => {
            setSelectedPaymentSchedule(schedule);
            trackEvent("payment_option_selected", {
              ...analyticsServiceParams,
              booking_step: "review",
              payment_schedule: schedule,
            });
            if (submit) void createIntent(schedule);
          }}
          loading={loading}
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
            const paidGuestCount = occupiedSeats(passengers);
            const paymentAnalyticsParams = {
              ...analyticsServiceParams,
              currency: "EUR",
              value: centsToAnalyticsValue(intent.amountCents),
              total_value: centsToAnalyticsValue(intent.totalCents),
              payment_schedule: selectedPaymentSchedule,
              guest_count: paidGuestCount,
            };
            trackEventOncePerSession(
              "payment-success:" + props.serviceId + ":" + intent.totalCents + ":" + intent.amountCents,
              "payment_success",
              paymentAnalyticsParams,
            );
            if (intent.analyticsTransactionId) {
              trackEventOncePerSession("purchase:" + intent.analyticsTransactionId, "purchase", {
                ...paymentAnalyticsParams,
                transaction_id: intent.analyticsTransactionId,
                items: [
                  {
                    item_id: props.serviceId,
                    item_name: props.serviceName,
                    item_category: props.serviceType,
                    quantity: Math.max(1, paidGuestCount),
                    price: centsToAnalyticsValue(intent.totalCents),
                  },
                ],
              });
            }
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
  const steps =
    locale === "es"
      ? CHECKOUT_STEPS_ES
      : locale === "fr"
        ? CHECKOUT_STEPS_FR
        : locale === "de"
          ? CHECKOUT_STEPS_DE
          : locale === "en"
            ? CHECKOUT_STEPS_EN
            : CHECKOUT_STEPS;
  const activeIndex = step === "success" ? steps.length : steps.findIndex((item) => item.key === step);

  return (
    <ol
      className="grid w-full grid-cols-4 items-center gap-1 text-xs font-semibold text-white/62 lg:w-auto lg:min-w-[390px]"
      aria-label={
        locale === "es"
          ? "Estado del checkout"
          : locale === "fr"
            ? "État du checkout"
            : locale === "de"
              ? "Checkout-Status"
              : locale === "en"
                ? "Checkout status"
                : "Stato checkout"
      }
    >
      {steps.map((item, index) => {
        const Icon = item.icon;
        const active = index === activeIndex;
        const complete = index < activeIndex;
        return (
          <li
            key={item.key}
            className={cnStep(
              "flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full px-1.5 transition sm:px-2 sm:py-2.5",
              active && "bg-white text-slate-950 shadow-lg shadow-black/15",
              complete && "bg-emerald-400/95 text-emerald-950",
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
      back: "Retour",
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
      back: "Atrás",
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

  if (locale === "de") {
    return {
      directCheckout: "Direkter Checkout",
      back: "Zurück",
      headerSubtitle: "Datum, Gäste, Kundendaten und Online-Zahlung.",
      acceptPolicies: "Akzeptieren Sie die Datenschutzerklärung und die AGB, um fortzufahren",
      completeCaptcha: "Schließen Sie die CAPTCHA-Prüfung ab, bevor Sie fortfahren",
      tooManyRequestsRetry: "Zu viele Anfragen. Versuchen Sie es erneut in",
      tooManyRequests: "Zu viele Anfragen. Versuchen Sie es in einigen Minuten erneut.",
      datesNoLongerAvailable: "Diese Daten sind nicht mehr verfügbar. Wählen Sie bitte andere Daten.",
      technicalIssue: "Vorübergehendes technisches Problem. Versuchen Sie es in einigen Minuten erneut oder schreiben Sie uns an",
      bookingCreationError: "Fehler beim Erstellen der Buchung",
      stripeCheckoutUnavailable: "Der Stripe-Checkout ist momentan nicht verfügbar. Versuchen Sie es in Kürze erneut.",
      overrideTooClose:
        "Dieses Datum ist nicht mehr verfügbar, weil es weniger als 15 Tage vor dem Erlebnis liegt.",
      overrideBooked: "Dieses Datum ist bereits gebucht. Wählen Sie bitte ein anderes Datum.",
      overrideBlockedByAdmin: "Dieses Datum wurde vom Team wegen Wartung blockiert.",
      overrideExternalBooking:
        "Dieses Datum ist bereits durch eine bestätigte Buchung auf einem externen Portal belegt. Wählen Sie bitte ein anderes Datum.",
      overrideUnavailable: "Dieses Datum ist für dieses Paket nicht verfügbar.",
      availabilityCheckPrefix: "Fehler bei der Verfügbarkeitsprüfung",
      availabilityCheckError: "Fehler bei der Verfügbarkeitsprüfung. Versuchen Sie es erneut.",
      checkingAvailability: "Verfügbarkeit wird geprüft...",
      paymentCompleted: "Zahlung abgeschlossen",
      code: "Code",
      successText:
        "Wir schließen die Buchung im zentralen System ab. Prüfen Sie Ihre E-Mail für die Details.",
      openSummary: "Zusammenfassung öffnen",
    };
  }

  if (locale === "en") {
    return {
      directCheckout: "Direct checkout",
      back: "Back",
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
    back: "Indietro",
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
      summaryTitle: "Votre sélection",
      charterSummaryTitle: "Période charter",
      start: "Départ",
      end: "Retour",
      duration: "Durée",
      estimatedPrice: "Total estimé",
      calculatingPrice: "Calcul en cours",
      priceUnavailable: "Prix non disponible pour cette sélection",
      selectStartDate: "Sélectionnez le départ",
      selectEndDate: "Sélectionnez le retour",
      customQuote: "Devis sur mesure",
      rangeUnavailable: "Non réservable",
      unavailableHelp: "Contactez l'équipe pour trouver une solution ensemble.",
      contactTeam: "Contacter l'équipe",
      days: "jours",
      until: "jusqu'au",
      to: "Au",
      charterTooShort: "Le charter nécessite au moins 3 jours.",
      charterTooLong: "Pour 8 jours ou plus, contactez l'équipe pour un devis sur mesure.",
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
      summaryTitle: "Tu selección",
      charterSummaryTitle: "Periodo charter",
      start: "Salida",
      end: "Regreso",
      duration: "Duración",
      estimatedPrice: "Total estimado",
      calculatingPrice: "Calculando",
      priceUnavailable: "Precio no disponible para esta selección",
      selectStartDate: "Selecciona la salida",
      selectEndDate: "Selecciona el regreso",
      customQuote: "Presupuesto a medida",
      rangeUnavailable: "No reservable",
      unavailableHelp: "Contacta con el equipo para encontrar una solución juntos.",
      contactTeam: "Contactar con el equipo",
      days: "días",
      until: "hasta el",
      to: "A",
      charterTooShort: "El charter requiere al menos 3 días.",
      charterTooLong: "Para 8 días o más, contacta con el equipo para un presupuesto a medida.",
      next: "Siguiente",
    };
  }

  if (locale === "de") {
    return {
      title: "Wählen Sie ein verfügbares Datum",
      calendarLegend: "Kalender für Verfügbarkeit und Preise",
      calendarUnavailable: "Kalender nicht verfügbar",
      calendarLoadError: "Wir können Verfügbarkeit und Preise im Moment nicht laden. Versuchen Sie es in Kürze erneut.",
      previousMonth: "Vorheriger Monat",
      nextMonth: "Nächster Monat",
      weekdays: ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"],
      includedInSelectedRange: ", im ausgewählten Zeitraum enthalten",
      available: "Verfügbar",
      onRequest: "Auf Anfrage",
      unavailable: "Nicht verfügbar",
      selectedDate: "Ausgewähltes Datum",
      selected: "Ausgewählt",
      selectedDuration: "Ausgewählte Dauer",
      summaryTitle: "Ihre Auswahl",
      charterSummaryTitle: "Charter-Zeitraum",
      start: "Start",
      end: "Rückkehr",
      duration: "Dauer",
      estimatedPrice: "Geschätzter Gesamtbetrag",
      calculatingPrice: "Berechnung läuft",
      priceUnavailable: "Preis für diese Auswahl nicht verfügbar",
      selectStartDate: "Start wählen",
      selectEndDate: "Rückkehr wählen",
      customQuote: "Individuelles Angebot",
      rangeUnavailable: "Nicht buchbar",
      unavailableHelp: "Kontaktieren Sie das Team, damit wir gemeinsam eine Lösung finden.",
      contactTeam: "Team kontaktieren",
      days: "Tage",
      until: "bis",
      to: "Bis",
      charterTooShort: "Der Charter erfordert mindestens 3 Tage.",
      charterTooLong: "Für 8 Tage oder mehr kontaktieren Sie bitte das Team für ein individuelles Angebot.",
      next: "Weiter",
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
      summaryTitle: "Your selection",
      charterSummaryTitle: "Charter period",
      start: "Departure",
      end: "Return",
      duration: "Duration",
      estimatedPrice: "Estimated total",
      calculatingPrice: "Calculating",
      priceUnavailable: "Price unavailable for this selection",
      selectStartDate: "Select departure",
      selectEndDate: "Select return",
      customQuote: "Tailored quote",
      rangeUnavailable: "Not bookable",
      unavailableHelp: "Contact the team so we can find a solution together.",
      contactTeam: "Contact the team",
      days: "days",
      until: "until",
      to: "To",
      charterTooShort: "Charter requires at least 3 days.",
      charterTooLong: "For 8 days or more, contact the team for a tailored quote.",
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
    summaryTitle: "La tua selezione",
    charterSummaryTitle: "Periodo charter",
    start: "Partenza",
    end: "Rientro",
    duration: "Durata",
    estimatedPrice: "Totale stimato",
    calculatingPrice: "Calcolo in corso",
    priceUnavailable: "Prezzo non disponibile per questa selezione",
    selectStartDate: "Seleziona la partenza",
    selectEndDate: "Seleziona il rientro",
    customQuote: "Quotazione su misura",
    rangeUnavailable: "Non prenotabile",
    unavailableHelp: "Contatta il team per trovare una soluzione insieme.",
    contactTeam: "Contatta il team",
    days: "giornate",
    until: "fino al",
    to: "A",
    charterTooShort: "Il charter richiede almeno 3 giornate.",
    charterTooLong:
      "Per 8 giornate o più contatta il team per una quotazione su misura.",
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

  if (locale === "de") {
    return {
      title: "Wer kommt an Bord?",
      seatsUsed: "Belegte Plätze",
      paidUnits: "Zahlende Einheiten",
      estimatedTotal: "Geschätzter Gesamtbetrag",
      loading: "Lädt",
      totalGuests: "Gäste insgesamt",
      capacityExceeded: "Sie haben mehr Plätze ausgewählt als verfügbar sind.",
      back: "Zurück",
      next: "Weiter",
      checking: "Prüfung...",
      decrease: "Verringern",
      increase: "Erhöhen",
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

  if (locale === "de") {
    return {
      days: "Tage",
      hours: "Stunden",
      oneGuest: "1 Gast",
      guests: "Gäste",
      fullPayment: "Vollzahlung",
      seatsUsed: "Belegte Plätze",
      paidUnits: "Zahlende Einheiten",
      eyebrow: "Vor der Zahlung prüfen",
      title: "Buchungsübersicht",
      subtitle: "Die Stripe-Zahlung öffnet sich erst nach dieser Bestätigung.",
      paymentQuestion: "Wie möchten Sie bezahlen?",
      recommended: "Empfohlen",
      depositDescription: "Sichern Sie das Datum jetzt, indem Sie nur die Anzahlung leisten.",
      calculating: "Berechnung läuft",
      fullPaymentDescription: "Bezahlen Sie die gesamte Buchung jetzt per Karte.",
      depositNote:
        "Der online gezahlte Betrag folgt der Stornierungsrichtlinie. Der Restbetrag wird vor Ort vor der Abfahrt bezahlt.",
      summary: "Zusammenfassung",
      date: "Datum",
      duration: "Dauer",
      guestsLabel: "Gäste",
      customer: "Kunde",
      phone: "Telefon",
      payment: "Zahlung",
      total: "Gesamt",
      now: "Jetzt",
      balanceOnSite: "Restbetrag vor Ort",
      priceUnavailable:
        "Preis noch nicht verfügbar. Gehen Sie zurück zum Datum und wählen Sie einen Tag mit konfigurierten Preisen.",
      serverRecalculationNote:
        "Der endgültige Gesamtbetrag wird bei der Bestätigung serverseitig anhand von Verfügbarkeit, Preisen und konfigurierten Rabatten neu berechnet. Ein eventueller Restbetrag wird vor Ort vor der Abfahrt bezahlt.",
      editDetails: "Daten bearbeiten",
      creatingPayment: "Zahlung wird erstellt...",
      confirmAndPay: "Bestätigen und zu Stripe gehen",
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
      title: "Vos coordonnées personnelles et de facturation",
      firstName: "Prénom",
      lastName: "Nom",
      phone: "Téléphone",
      nationality: "Nationalité",
      billingTitle: "Adresse de facturation",
      billingDescription: "Ces informations sont requises pour chaque réservation.",
      billingCountry: "Pays de facturation",
      taxIdItaly: "Code fiscal italien",
      taxIdForeign: "Identifiant fiscal étranger",
      taxIdForeignHint: "Facultatif si votre pays n'en attribue pas aux particuliers.",
      addressLine1: "Adresse",
      addressLine2: "Complément d'adresse (facultatif)",
      city: "Ville",
      provinceItaly: "Province",
      provinceForeign: "Région / État (facultatif)",
      postalCode: "Code postal",
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
      title: "Tus datos personales y de facturación",
      firstName: "Nombre",
      lastName: "Apellidos",
      phone: "Teléfono",
      nationality: "Nacionalidad",
      billingTitle: "Dirección de facturación",
      billingDescription: "Estos datos son obligatorios para cada reserva.",
      billingCountry: "País de facturación",
      taxIdItaly: "Código fiscal italiano",
      taxIdForeign: "Identificación fiscal extranjera",
      taxIdForeignHint: "Opcional si tu país no la asigna a particulares.",
      addressLine1: "Dirección",
      addressLine2: "Dirección adicional (opcional)",
      city: "Ciudad",
      provinceItaly: "Provincia",
      provinceForeign: "Región / Estado (opcional)",
      postalCode: "Código postal",
      privacyPrefix: "He leído y acepto la",
      termsPrefix: "Acepto los",
      terms: "Términos y condiciones",
      termsSuffix: "de reserva, incluida la política de cancelación.",
      back: "Atrás",
      wait: "Espera...",
      continueToPayment: "Continuar al pago",
    };
  }

  if (locale === "de") {
    return {
      title: "Ihre persönlichen und Rechnungsdaten",
      firstName: "Vorname",
      lastName: "Nachname",
      phone: "Telefon",
      nationality: "Staatsangehörigkeit",
      billingTitle: "Rechnungsanschrift",
      billingDescription: "Diese Angaben sind für jede Buchung erforderlich.",
      billingCountry: "Rechnungsland",
      taxIdItaly: "Italienische Steuernummer",
      taxIdForeign: "Ausländische Steuer-ID",
      taxIdForeignHint: "Optional, wenn Ihr Land Privatpersonen keine Steuer-ID zuweist.",
      addressLine1: "Adresse",
      addressLine2: "Adresszusatz (optional)",
      city: "Ort",
      provinceItaly: "Provinz",
      provinceForeign: "Region / Bundesland (optional)",
      postalCode: "Postleitzahl",
      privacyPrefix: "Ich akzeptiere die",
      termsPrefix: "Ich akzeptiere die",
      terms: "AGB",
      termsSuffix: "der Buchung, einschließlich der Stornierungsrichtlinie.",
      back: "Zurück",
      wait: "Bitte warten...",
      continueToPayment: "Weiter zur Zahlung",
    };
  }

  if (locale === "en") {
    return {
      title: "Your personal and billing details",
      firstName: "First name",
      lastName: "Last name",
      phone: "Phone",
      nationality: "Nationality",
      billingTitle: "Billing address",
      billingDescription: "These details are required for every booking.",
      billingCountry: "Billing country",
      taxIdItaly: "Italian tax code",
      taxIdForeign: "Foreign tax ID",
      taxIdForeignHint: "Optional if your country does not issue one to private individuals.",
      addressLine1: "Address",
      addressLine2: "Address line 2 (optional)",
      city: "City",
      provinceItaly: "Province",
      provinceForeign: "Region / State (optional)",
      postalCode: "Postal code",
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
    title: "I tuoi dati personali e di fatturazione",
    firstName: "Nome",
    lastName: "Cognome",
    phone: "Telefono",
    nationality: "Nazionalità",
    billingTitle: "Indirizzo di fatturazione",
    billingDescription: "Questi dati sono obbligatori per ogni prenotazione.",
    billingCountry: "Paese di fatturazione",
    taxIdItaly: "Codice Fiscale",
    taxIdForeign: "Identificativo fiscale estero",
    taxIdForeignHint: "Facoltativo se il tuo Paese non ne assegna uno ai privati.",
    addressLine1: "Indirizzo",
    addressLine2: "Indirizzo aggiuntivo (facoltativo)",
    city: "Città",
    provinceItaly: "Provincia",
    provinceForeign: "Regione / Stato (facoltativo)",
    postalCode: "CAP / codice postale",
    privacyPrefix: "Ho letto e accetto la",
    termsPrefix: "Accetto i",
    terms: "Termini & Condizioni",
    termsSuffix: "di prenotazione, inclusa la policy di cancellazione.",
    back: "Indietro",
    wait: "Attendere...",
    continueToPayment: "Procedi al pagamento",
  };
}

function passengerCategoryLabel(rule: PassengerFareCategoryConfig, locale: string): string {
  if (locale === "fr") {
    if (rule.category === "ADULT") return "Adultes";
    if (rule.category === "CHILD") return "Enfants";
    return "Bébés";
  }
  if (locale === "es") {
    if (rule.category === "ADULT") return "Adultos";
    if (rule.category === "CHILD") return "Niños";
    return "Bebés";
  }
  if (locale === "de") {
    if (rule.category === "ADULT") return "Erwachsene";
    if (rule.category === "CHILD") return "Kinder";
    return "Babys";
  }
  if (locale !== "en") return rule.label;
  if (rule.category === "ADULT") return "Adults";
  if (rule.category === "CHILD") return "Children";
  return "Infants";
}

function passengerCategoryHint(rule: PassengerFareCategoryConfig, locale: string): string {
  if (locale === "fr") {
    if (rule.category === "ADULT") return "Âge 10+";
    if (rule.category === "CHILD") return "Âge 4-9";
    return "Âge 0-3";
  }
  if (locale === "es") {
    if (rule.category === "ADULT") return "Edad 10+";
    if (rule.category === "CHILD") return "Edad 4-9";
    return "Edad 0-3";
  }
  if (locale === "de") {
    if (rule.category === "ADULT") return "Alter 10+";
    if (rule.category === "CHILD") return "Alter 4-9";
    return "Alter 0-3";
  }
  if (locale !== "en") return rule.ageLabel;
  if (rule.category === "ADULT") return "Age 10+";
  if (rule.category === "CHILD") return "Age 4-9";
  return "Age 0-3";
}

interface CalendarApiDay {
  date: string;
  status: "available" | "request" | "unavailable";
  selectable: boolean;
  priceLabel: string | null;
  priceHint: string | null;
  priceAmount: number | null;
  pricingUnit: string | null;
  passengerCategoryPrices: PassengerFareCategoryPriceConfig[] | null;
  spotsRemaining: number | null;
  reasonLabel: string | null;
}

function calendarDayAriaLabel(
  date: string,
  day?: CalendarApiDay,
  locale?: string | null,
  isCharterEndCandidate = false,
  isCharterIntermediateDay = false,
): string {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const formatted = new Intl.DateTimeFormat(clientIntlLocale(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
  if (isCharterIntermediateDay) {
    const stateLabel = isEs
      ? "día intermedio libre"
      : isFr
        ? "jour intermédiaire libre"
        : isDe
          ? "freier Zwischentag"
          : isEn
            ? "available intermediate day"
            : "giorno intermedio libero";
    return [formatted, stateLabel].join(", ");
  }
  if (isCharterEndCandidate) {
    return `${formatted}, ${
      isEs
        ? "seleccionar como regreso"
        : isFr
          ? "sélectionner comme retour"
          : isDe
            ? "als Rückkehr auswählen"
            : isEn
              ? "select as return date"
              : "seleziona come data di ritorno"
    }`;
  }
  if (!day) {
    return `${formatted}, ${
      isEs
        ? "cargando disponibilidad"
        : isFr
          ? "chargement des disponibilités"
          : isDe
            ? "Verfügbarkeit wird geladen"
            : isEn
              ? "loading availability"
              : "caricamento disponibilità"
    }`;
  }
  return `${formatted}, ${
    day.reasonLabel ??
    (isEs
      ? "no disponible"
      : isFr
        ? "indisponible"
        : isDe
          ? "nicht verfügbar"
          : isEn
          ? "unavailable"
            : "non disponibile")
  }`;
}

function calendarDayClass({
  selected,
  rangeSelected,
  outOfMonth,
  status,
  isCharterEndCandidate,
  isCharterIntermediateDay,
  selectable,
  loading,
  fillAvailableHeight,
}: {
  selected: boolean;
  rangeSelected: boolean;
  outOfMonth: boolean;
  status?: CalendarApiDay["status"];
  isCharterEndCandidate: boolean;
  isCharterIntermediateDay: boolean;
  selectable: boolean;
  loading: boolean;
  fillAvailableHeight: boolean;
}): string {
  return cnStep(
    "relative flex h-10 w-full min-w-0 flex-col items-center justify-center overflow-hidden rounded-md border text-center transition focus:outline-none focus:ring-2 focus:ring-sky-500 sm:h-12 sm:items-stretch sm:justify-start sm:p-1.5 sm:text-left",
    fillAvailableHeight ? "lg:h-full" : "lg:h-14",
    selectable ? "cursor-pointer" : isCharterIntermediateDay ? "cursor-default" : "cursor-not-allowed",
    (selected || rangeSelected) &&
      "border-sky-700 bg-sky-700 text-white shadow-sm ring-2 ring-sky-200 hover:bg-sky-800",
    !selected &&
      !rangeSelected &&
      !status &&
      !isCharterEndCandidate &&
      !isCharterIntermediateDay &&
      "border-slate-200 bg-white text-slate-400",
    !selected &&
      !rangeSelected &&
      status === "available" &&
      "border-emerald-300 bg-emerald-50 text-slate-950 shadow-sm hover:bg-emerald-100",
    !selected &&
      !rangeSelected &&
      status === "request" &&
      "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
    !selected &&
      !rangeSelected &&
      status === "unavailable" &&
      "border-slate-400 bg-slate-300 text-slate-700",
    !selected &&
      !rangeSelected &&
      isCharterIntermediateDay &&
      "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-sm",
    !selected &&
      !rangeSelected &&
      isCharterEndCandidate &&
      "border-sky-400 bg-sky-100 text-sky-950 shadow-sm hover:bg-sky-200",
    outOfMonth && !selected && !rangeSelected && "opacity-55",
    loading && "animate-pulse",
  );
}

function calendarDayDotClass({
  selected,
  rangeSelected,
  status,
  isCharterEndCandidate,
  isCharterIntermediateDay,
  loading,
}: {
  selected: boolean;
  rangeSelected: boolean;
  status?: CalendarApiDay["status"];
  isCharterEndCandidate: boolean;
  isCharterIntermediateDay: boolean;
  loading: boolean;
}): string {
  return cnStep(
    "mt-1 size-1.5 rounded-full sm:hidden",
    (selected || rangeSelected) && "bg-white",
    !selected && !rangeSelected && status === "available" && "bg-emerald-500",
    !selected && !rangeSelected && status === "request" && "bg-amber-500",
    !selected && !rangeSelected && status === "unavailable" && "bg-slate-600",
    !selected && !rangeSelected && isCharterIntermediateDay && "bg-emerald-500",
    !selected && !rangeSelected && isCharterEndCandidate && "bg-sky-500",
    !selected &&
      !rangeSelected &&
      !status &&
      !isCharterEndCandidate &&
      !isCharterIntermediateDay &&
      "bg-slate-200",
    loading && "animate-pulse",
  );
}

function DateStep({
  locale,
  serviceId,
  value,
  endValue,
  isCharter,
  fixedDurationDays,
  serviceType,
  capacityMax,
  passengers,
  passengerCategories,
  onChange,
  onEndChange,
  onPassengersChange,
  onNext,
  onBack,
  backLabel,
  canContinue,
  selectedPrice,
  onPriceChange,
  checking,
  overrideMessage,
  fillAvailableHeight,
}: {
  locale: string;
  serviceId: string;
  value: string;
  endValue: string;
  isCharter: boolean;
  fixedDurationDays?: number;
  serviceType: string;
  capacityMax: number;
  passengers: PassengerBreakdown;
  passengerCategories: PassengerFareCategoryConfig[];
  onChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onPassengersChange: (passengers: PassengerBreakdown) => void;
  onNext: () => void;
  onBack?: () => void;
  backLabel: string;
  canContinue: boolean;
  selectedPrice: SelectedPrice | null;
  onPriceChange: (price: SelectedPrice | null) => void;
  checking: boolean;
  overrideMessage?: string;
  fillAvailableHeight: boolean;
}) {
  const copy = useMemo(() => getDateStepCopy(locale), [locale]);
  const peopleCopy = useMemo(() => getPeopleStepCopy(locale), [locale]);
  const [visibleMonth, setVisibleMonth] = useState(() =>
    monthKeyFromIso(value || new Date().toISOString().slice(0, 10)),
  );
  const [calendarDays, setCalendarDays] = useState<Record<string, CalendarApiDay>>({});
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [rangeQuoteDay, setRangeQuoteDay] = useState<CalendarApiDay | null>(null);
  const [rangeQuoteLoading, setRangeQuoteLoading] = useState(false);
  const charterDurationDays = isCharter ? inclusiveDaysBetween(value, endValue) : null;
  const charterHasRange = isCharter && Boolean(value && endValue);
  const charterIsTooShort =
    isCharter &&
    Boolean(value && endValue) &&
    (charterDurationDays === null || charterDurationDays < 3);
  const charterIsTooLong = isCharter && charterDurationDays !== null && charterDurationDays > 7;
  const charterHasValidRange =
    isCharter &&
    Boolean(value && endValue) &&
    charterDurationDays !== null &&
    charterDurationDays >= 3 &&
    charterDurationDays <= 7;
  const fixedEndDate =
    isCharter && fixedDurationDays && value ? addIsoDays(value, fixedDurationDays - 1) : "";
  const selectedRangeEnd =
    isCharter && value ? fixedEndDate || (endValue >= value ? endValue : value) : value;
  const range = useMemo(() => calendarRange(visibleMonth), [visibleMonth]);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const canGoPrevious = visibleMonth > currentMonth;
  const selectedDay = value ? calendarDays[value] : undefined;
  const effectiveSelectedDay = isCharter && !fixedDurationDays ? rangeQuoteDay : selectedDay;
  const rangeBlocksContinue =
    isCharter &&
    !fixedDurationDays &&
    charterHasValidRange &&
    (rangeQuoteLoading || !effectiveSelectedDay || effectiveSelectedDay.selectable === false);
  const seats = occupiedSeats(passengers);
  const totalGuests = totalGuestCountFromBreakdown(passengers);
  const capacityExceeded = seats > capacityMax;
  const estimatedTotal = estimateTotalAmount(serviceType, passengers, selectedPrice);
  const canSubmit =
    canContinue &&
    !rangeBlocksContinue &&
    !checking &&
    !capacityExceeded &&
    seats >= 1;
  const selectedPriceLabel =
    estimatedTotal !== null
      ? formatClientEurWithVat(estimatedTotal, locale)
      : effectiveSelectedDay?.priceLabel ?? null;
  const selectedUnavailable =
    (isCharter &&
      charterHasRange &&
      charterHasValidRange &&
      effectiveSelectedDay?.selectable === false) ||
    (!isCharter && Boolean(value) && selectedDay?.selectable === false);
  const contactHref = contactPath(locale);

  function updatePassenger(key: keyof PassengerBreakdown, nextValue: number) {
    onPassengersChange({
      ...passengers,
      [key]: Math.max(0, Math.min(50, nextValue)),
    });
  }

  function resetDynamicRangeQuote() {
    if (!isCharter || fixedDurationDays) return;
    setRangeQuoteDay(null);
    setRangeQuoteLoading(false);
    onPriceChange(null);
  }

  function selectCalendarDate(date: string) {
    if (!isCharter) {
      onChange(date);
      return;
    }

    if (fixedDurationDays) {
      onChange(date);
      onEndChange(addIsoDays(date, fixedDurationDays - 1));
      return;
    }

    resetDynamicRangeQuote();
    if (!value || endValue || date < value) {
      onChange(date);
      onEndChange("");
      return;
    }

    onEndChange(date);
  }

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
  }, [
    copy.calendarLoadError,
    copy.calendarUnavailable,
    fixedDurationDays,
    isCharter,
    locale,
    range.end,
    range.start,
    serviceId,
  ]);

  useEffect(() => {
    if (isCharter && !fixedDurationDays) return;
    const day = value ? calendarDays[value] : null;
    if (day?.priceAmount != null && day.pricingUnit) {
      onPriceChange({
        amount: day.priceAmount,
        pricingUnit: day.pricingUnit,
        passengerCategoryPrices: day.passengerCategoryPrices ?? null,
      });
    } else {
      onPriceChange(null);
    }
  }, [calendarDays, fixedDurationDays, isCharter, onPriceChange, value]);

  useEffect(() => {
    if (!isCharter || fixedDurationDays) return;
    if (!value || !charterHasValidRange || !charterDurationDays) {
      queueMicrotask(() => {
        setRangeQuoteDay(null);
        setRangeQuoteLoading(false);
        onPriceChange(null);
      });
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams({
      serviceId,
      start: value,
      end: value,
      locale,
      durationDays: String(charterDurationDays),
    });
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        setRangeQuoteLoading(true);
      }
    });

    fetch(`/api/booking-calendar?${params.toString()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(copy.calendarUnavailable);
        const body = (await res.json()) as { data?: { days?: CalendarApiDay[] } };
        const day = body.data?.days?.find((item) => item.date === value) ?? null;
        setRangeQuoteDay(day);
        if (day?.priceAmount != null && day.pricingUnit && day.selectable) {
          onPriceChange({
            amount: day.priceAmount,
            pricingUnit: day.pricingUnit,
            passengerCategoryPrices: day.passengerCategoryPrices ?? null,
          });
        } else {
          onPriceChange(null);
        }
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setRangeQuoteDay(null);
          onPriceChange(null);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setRangeQuoteLoading(false);
      });

    return () => controller.abort();
  }, [
    charterDurationDays,
    charterHasValidRange,
    copy.calendarUnavailable,
    fixedDurationDays,
    isCharter,
    locale,
    onPriceChange,
    serviceId,
    value,
  ]);

  const displayedEndDate = fixedEndDate || endValue;

  return (
    <form
      className={cnStep(
        "flex w-full min-w-0 flex-col gap-3 lg:min-h-0",
        fillAvailableHeight && "lg:h-full lg:flex-1",
      )}
      onSubmit={(event) => {
        event.preventDefault();
        if (canSubmit) onNext();
      }}
    >
      <h2 className="sr-only">{copy.title}</h2>

      {onBack && (
        <div className="shrink-0">
          <button
            type="button"
            onClick={onBack}
            disabled={checking}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {backLabel}
          </button>
        </div>
      )}

      <div
        className={cnStep(
          "grid w-full min-w-0 gap-3 lg:min-h-0 lg:flex-1 lg:grid-cols-[minmax(0,1fr)_clamp(20rem,28vw,30rem)]",
          fillAvailableHeight ? "lg:h-full lg:grid-rows-1 lg:items-stretch" : "lg:items-start",
        )}
      >
        <div className={cnStep("w-full min-w-0 lg:min-h-0", fillAvailableHeight && "lg:h-full")}>
          <fieldset
            className={cnStep(
              "w-full min-w-0 rounded-lg border border-slate-200 bg-white p-2 shadow-sm sm:p-3",
              fillAvailableHeight && "lg:flex lg:h-full lg:min-h-0 lg:flex-col",
            )}
          >
            <legend className="sr-only">{copy.calendarLegend}</legend>
            <div className="mb-2 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
                disabled={checking || !canGoPrevious}
                className="inline-flex size-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 disabled:opacity-40"
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
                disabled={checking}
                className="inline-flex size-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={copy.nextMonth}
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>

            <div className="grid min-w-0 grid-cols-7 gap-0.5 text-center text-[10px] font-bold uppercase text-slate-500 sm:gap-1">
              {copy.weekdays.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>
            <div
              className={cnStep(
                "mt-1 grid min-w-0 grid-cols-7 gap-0.5 sm:gap-1",
                fillAvailableHeight &&
                  "lg:min-h-0 lg:flex-1 lg:grid-rows-[repeat(6,minmax(2.5rem,1fr))]",
              )}
            >
              {range.days.map((date) => {
                const day = calendarDays[date];
                const outOfMonth = monthKeyFromIso(date) !== visibleMonth;
                const selected = value === date || (Boolean(displayedEndDate) && displayedEndDate === date);
                const rangeSelected = Boolean(
                  value && selectedRangeEnd && date >= value && date <= selectedRangeEnd,
                );
                const includedInSelectedRange = rangeSelected && !selected;
                const selection = resolveCalendarDateSelection({
                  isCharter,
                  fixedDurationDays,
                  startDate: value,
                  endDate: endValue,
                  candidateDate: date,
                  availabilityLoaded: Boolean(day),
                  daySelectable: Boolean(day?.selectable),
                });
                const selectable = selection.selectable;
                const displayedStatus =
                  selection.isCharterEndCandidate || selection.isCharterIntermediateDay
                  ? undefined
                  : day?.status;
                return (
                  <button
                    key={date}
                    type="button"
                    disabled={checking || !selectable}
                    onClick={() => {
                      selectCalendarDate(date);
                      if (!isCharter && day?.priceAmount != null && day.pricingUnit) {
                        onPriceChange({
                          amount: day.priceAmount,
                          pricingUnit: day.pricingUnit,
                          passengerCategoryPrices: day.passengerCategoryPrices ?? null,
                        });
                      } else if (!isCharter) {
                        onPriceChange(null);
                      }
                      if (outOfMonth) setVisibleMonth(monthKeyFromIso(date));
                    }}
                    aria-pressed={selected || rangeSelected}
                    aria-label={`${calendarDayAriaLabel(
                      date,
                      day,
                      locale,
                      selection.isCharterEndCandidate,
                      selection.isCharterIntermediateDay,
                    )}${
                      includedInSelectedRange ? copy.includedInSelectedRange : ""
                    }`}
                    className={calendarDayClass({
                      selected,
                      rangeSelected,
                      outOfMonth,
                      status: displayedStatus,
                      isCharterEndCandidate: selection.isCharterEndCandidate,
                      isCharterIntermediateDay: selection.isCharterIntermediateDay,
                      selectable,
                      loading: calendarLoading && !day,
                      fillAvailableHeight,
                    })}
                  >
                    <span className="block w-full shrink-0 text-center text-sm font-bold leading-none sm:text-left">
                      {Number(date.slice(8, 10))}
                    </span>
                    <span className="mt-1 hidden min-h-4 w-full max-w-full truncate text-center text-[10px] font-semibold leading-tight tabular-nums sm:block sm:text-left">
                      {includedInSelectedRange
                        ? locale === "es"
                          ? "Incluido"
                          : locale === "fr"
                            ? "Inclus"
                            : locale === "en"
                              ? "Included"
                              : "Incluso"
                        : selection.isCharterIntermediateDay
                          ? locale === "es"
                            ? "Intermedio"
                            : locale === "fr"
                              ? "Intermédiaire"
                              : locale === "de"
                                ? "Zwischentag"
                                : locale === "en"
                                  ? "Intermediate"
                                  : "Intermedio"
                          : selection.isCharterEndCandidate
                          ? locale === "es"
                            ? "Regreso"
                            : locale === "fr"
                              ? "Retour"
                              : locale === "de"
                                ? "Rückkehr"
                                : locale === "en"
                                  ? "Return"
                                  : "Rientro"
                          : day?.reasonLabel ?? (calendarLoading ? "..." : "")}
                    </span>
                    <span
                      className={calendarDayDotClass({
                        selected,
                        rangeSelected,
                        status: displayedStatus,
                        isCharterEndCandidate: selection.isCharterEndCandidate,
                        isCharterIntermediateDay: selection.isCharterIntermediateDay,
                        loading: calendarLoading && !day,
                      })}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-semibold text-slate-600 sm:text-[11px]">
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
                {copy.available}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
                {copy.onRequest}
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="size-2 rounded-full bg-slate-600" aria-hidden="true" />
                {copy.unavailable}
              </span>
            </div>
            {calendarError && (
              <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {calendarError}
              </p>
            )}
          </fieldset>
        </div>

        <aside
          className={cnStep(
            "w-full min-w-0 rounded-lg border border-slate-200 bg-slate-50 p-3 shadow-sm",
            fillAvailableHeight
              ? "lg:flex lg:h-full lg:min-h-0 lg:flex-col lg:overflow-y-auto"
              : "lg:sticky lg:top-24",
          )}
        >
          <p className="text-xs font-black uppercase tracking-[0.14em] text-sky-700">
            {isCharter ? copy.charterSummaryTitle : copy.summaryTitle}
          </p>

          {isCharter ? (
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-lg border border-white bg-white px-3 py-2">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  {copy.start}
                </p>
                <p className="mt-1 font-bold text-slate-950">
                  {value ? formatIsoDateLabel(value, locale) : copy.selectStartDate}
                </p>
              </div>
              <div className="rounded-lg border border-white bg-white px-3 py-2">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  {copy.end}
                </p>
                <p className="mt-1 font-bold text-slate-950">
                  {displayedEndDate ? formatIsoDateLabel(displayedEndDate, locale) : copy.selectEndDate}
                </p>
              </div>
            </div>
          ) : null}

          {!isCharter && (
            <dl className="mt-3 grid gap-2">
              <div className="rounded-lg border border-white bg-white px-3 py-2">
                <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                  {copy.selectedDate}
                </dt>
                <dd className="mt-1 font-bold text-slate-950">
                  {value ? formatIsoDateLabel(value, locale) : copy.selectStartDate}
                </dd>
              </div>
            </dl>
          )}

          <fieldset className="mt-3 min-w-0">
            <legend className="text-xs font-black uppercase tracking-[0.14em] text-sky-700">
              {peopleCopy.title}
            </legend>
            <div className="mt-2 grid min-w-0 gap-2 sm:grid-cols-3 lg:grid-cols-1">
              {passengerCategories.map((rule) => {
                const field = PASSENGER_CATEGORY_FIELD[rule.category];
                const unitPrice = passengerCategoryUnitPrice(rule, serviceType, selectedPrice);
                return (
                  <PassengerCounter
                    key={rule.category}
                    id={`wizard-date-${field}`}
                    label={passengerCategoryLabel(rule, locale)}
                    hint={passengerCategoryHint(rule, locale)}
                    priceLabel={
                      unitPrice == null ? undefined : formatClientEurWithVat(unitPrice, locale)
                    }
                    value={passengers[field]}
                    min={0}
                    icon={
                      rule.category === "ADULT" || rule.category === "CHILD" ? (
                        <Users className="size-4" aria-hidden="true" />
                      ) : (
                        <Baby className="size-4" aria-hidden="true" />
                      )
                    }
                    onChange={(nextValue) => updatePassenger(field, nextValue)}
                    decrementText={peopleCopy.decrease}
                    incrementText={peopleCopy.increase}
                    disabled={checking}
                  />
                );
              })}
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-600">
              {peopleCopy.seatsUsed}: <strong className="text-slate-950">{seats}/{capacityMax}</strong>
              <span aria-hidden="true"> · </span>
              {peopleCopy.totalGuests}: <strong className="text-slate-950">{totalGuests}</strong>
            </p>
          </fieldset>

          <dl className="mt-3 grid gap-2">
            <div className="rounded-lg border border-white bg-white px-3 py-2">
              <dt className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">
                {copy.estimatedPrice}
              </dt>
              <dd className="mt-1 font-bold tabular-nums text-slate-950">
                {charterIsTooLong
                  ? copy.customQuote
                  : rangeQuoteLoading
                  ? copy.calculatingPrice
                  : selectedPriceLabel ?? (value ? copy.priceUnavailable : "-")}
              </dd>
            </div>
          </dl>

          {capacityExceeded && (
            <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {peopleCopy.capacityExceeded}
            </p>
          )}

          {charterIsTooShort && (
            <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800">
              {copy.charterTooShort}
            </p>
          )}
          {charterIsTooLong && (
            <div className="mt-3 rounded-lg border border-sky-200 bg-sky-50 px-3 py-3 text-sm text-sky-900">
              <p className="font-semibold leading-5">{copy.charterTooLong}</p>
              <a
                href={contactHref}
                className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-black text-sky-900 shadow-sm ring-1 ring-sky-200 hover:bg-sky-100"
              >
                {copy.contactTeam}
              </a>
            </div>
          )}
          {selectedUnavailable && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-3 text-sm text-red-800">
              <p className="font-black">{copy.rangeUnavailable}</p>
              <p className="mt-1 leading-5">{copy.unavailableHelp}</p>
              <a
                href={contactHref}
                className="mt-3 inline-flex rounded-full bg-white px-3 py-1.5 text-xs font-black text-red-800 shadow-sm ring-1 ring-red-200 hover:bg-red-100"
              >
                {copy.contactTeam}
              </a>
            </div>
          )}
          {overrideMessage && (
            <p
              role="alert"
              className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {overrideMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={!canSubmit}
            className={cnStep(
              "mt-3 inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d97706] px-5 py-3 text-base font-black text-white shadow-lg shadow-amber-900/15 transition hover:bg-[#f2b84b] hover:text-[#06233a] disabled:cursor-not-allowed disabled:opacity-50",
              fillAvailableHeight && "lg:mt-auto",
            )}
          >
            {checking ? peopleCopy.checking : copy.next}
            {!checking && <ChevronRight className="size-4" aria-hidden="true" />}
          </button>
        </aside>
      </div>
    </form>
  );
}

function PassengerCounter({
  id,
  label,
  hint,
  priceLabel,
  value,
  min,
  icon,
  onChange,
  decrementText = "Diminuisci",
  incrementText = "Aumenta",
  disabled = false,
}: {
  id: string;
  label: string;
  hint: string;
  priceLabel?: string;
  value: number;
  min: number;
  icon: ReactNode;
  onChange: (n: number) => void;
  decrementText?: string;
  incrementText?: string;
  disabled?: boolean;
}) {
  return (
    <div className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(7rem,0.9fr)] items-center gap-2 overflow-hidden rounded-lg border border-slate-200 bg-white p-2.5 shadow-sm transition focus-within:border-sky-300 focus-within:ring-2 focus-within:ring-sky-100 sm:block lg:grid">
      <div className="flex min-w-0 items-center gap-2 sm:mb-2 lg:mb-0">
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-800">
          {icon}
        </span>
        <div className="min-w-0">
          <label htmlFor={id} className="block text-sm font-bold text-slate-950">
            {label}
          </label>
          <p className="text-xs leading-4 text-slate-500">{hint}</p>
          {priceLabel && (
            <p className="mt-1 text-xs font-bold leading-4 text-sky-800">{priceLabel}</p>
          )}
        </div>
      </div>
      <div className="flex w-full min-w-0 items-center gap-1.5">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={disabled || value <= min}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-300 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-40"
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
          disabled={disabled}
          onChange={(event) => {
            const digits = event.target.value.replace(/\D/g, "");
            onChange(digits ? Number.parseInt(digits, 10) : 0);
          }}
          className="h-9 w-0 min-w-0 flex-1 rounded-md border border-slate-300 text-center text-base font-bold tabular-nums disabled:cursor-not-allowed disabled:bg-slate-100 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          disabled={disabled}
          className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-slate-300 text-lg font-bold disabled:cursor-not-allowed disabled:opacity-40"
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
  passengerCategories,
  customer,
  billingDetails,
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
  passengerCategories: PassengerFareCategoryConfig[];
  customer: Customer;
  billingDetails: PrivateBillingDetails;
  selectedPrice: SelectedPrice | null;
  paymentSchedule: CheckoutPaymentSchedule;
  depositPercentage: number;
  onPaymentScheduleChange: (schedule: CheckoutPaymentSchedule, submit?: boolean) => void;
  loading: boolean;
  onBack?: () => void;
  onConfirm: () => void;
}) {
  const copy = getReviewStepCopy(locale);
  const customerCopy = getCustomerStepCopy(locale);
  const totalAmount = estimateTotalAmount(serviceType, passengers, selectedPrice);
  const payment = estimatePaymentBreakdown(totalAmount, paymentSchedule, depositPercentage);
  const seats = occupiedSeats(passengers);
  const totalGuests = totalGuestCountFromBreakdown(passengers);
  const paidUnits = paidUnitsForClient(serviceType, passengers, selectedPrice);
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
  const billingAddress = [
    billingDetails.addressLine1,
    billingDetails.addressLine2,
    `${billingDetails.postalCode} ${billingDetails.city}`.trim(),
    billingDetails.province,
    localizedCountryName(billingDetails.countryCode, locale),
  ]
    .filter(Boolean)
    .join(", ");
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
  const showGuestBreakdown = passengerCategories.some(
    (rule) => rule.active && passengers[PASSENGER_CATEGORY_FIELD[rule.category]] > 0,
  );
  const guestAccountingDetails = [
    seats !== totalGuests ? `${copy.seatsUsed}: ${seats}` : null,
    Math.abs(paidUnits - seats) > 0.001 ? `${copy.paidUnits}: ${paidUnitsLabel}` : null,
  ].filter(Boolean);
  function selectPaymentSchedule(schedule: CheckoutPaymentSchedule) {
    onPaymentScheduleChange(schedule, Boolean(payment && !loading));
  }

  return (
    <form
      className="space-y-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (payment && !loading) onConfirm();
      }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
          {copy.eyebrow}
        </p>
        <h2 className="mt-1 font-heading text-2xl font-bold text-slate-950 sm:text-3xl">{copy.title}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-600">
          {copy.subtitle}
        </p>
      </div>

      <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <legend className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
          {copy.paymentQuestion}
        </legend>
        <div className="mt-2 grid gap-2 md:grid-cols-2">
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
            onChange={() => selectPaymentSchedule("DEPOSIT_BALANCE")}
            disabled={loading}
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
            onChange={() => selectPaymentSchedule("FULL")}
            disabled={loading}
          />
        </div>
        {paymentSchedule === "DEPOSIT_BALANCE" && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            {copy.depositNote}
          </p>
        )}
      </fieldset>

      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="flex flex-col gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-start sm:justify-between">
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

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-slate-200 py-3 sm:grid-cols-3">
          <SummaryMetric label={copy.date} value={dateLabel} />
          <SummaryMetric label={copy.duration} value={durationLabel} />
          <SummaryMetric label={copy.guestsLabel} value={guestLabel} />
        </div>

        {(showGuestBreakdown || guestAccountingDetails.length > 0) && (
          <div className="border-b border-slate-200 py-2">
            {showGuestBreakdown && (
              <div className="flex flex-wrap gap-2">
                {passengerCategories.map((rule) => {
                  const value = passengers[PASSENGER_CATEGORY_FIELD[rule.category]];
                  return value > 0 ? (
                    <SummaryPill
                      key={rule.category}
                      label={passengerCategoryLabel(rule, locale)}
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

        <div className="grid grid-cols-2 gap-x-4 gap-y-3 border-b border-slate-200 py-3">
          <SummaryMetric label={copy.customer} value={customerName} />
          <SummaryMetric label={copy.phone} value={customer.phone} />
          <div className="col-span-2">
            <SummaryMetric label="Email" value={customer.email} />
          </div>
        </div>

        <div className="border-b border-slate-200 py-3">
          <h4 className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            {customerCopy.billingTitle}
          </h4>
          <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <SummaryMetric label={customerCopy.addressLine1} value={billingAddress} />
            </div>
            <SummaryMetric
              label={customerCopy.nationality}
              value={localizedCountryName(customer.nationality, locale)}
            />
            {billingDetails.taxId && (
              <SummaryMetric
                label={
                  billingDetails.countryCode === "IT"
                    ? customerCopy.taxIdItaly
                    : customerCopy.taxIdForeign
                }
                value={billingDetails.taxId}
              />
            )}
          </div>
        </div>

        <div className="pt-3">
          <h4 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
            {copy.payment}
          </h4>
          {payment ? (
            <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3">
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
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-full border border-gray-300 px-4 py-3 text-center font-semibold disabled:opacity-50"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            {copy.editDetails}
          </button>
        )}
        <button
          type="submit"
          disabled={!payment || loading}
          className="inline-flex w-full flex-1 items-center justify-center gap-2 rounded-full bg-[#d97706] px-4 py-3 text-center font-black text-white shadow-lg shadow-amber-900/15 transition hover:bg-[#f2b84b] hover:text-[#06233a] disabled:opacity-50"
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
  disabled = false,
}: {
  checked: boolean;
  title: string;
  badge?: string;
  description: string;
  amount: string;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      onClick={() => {
        if (checked && !disabled) onChange();
      }}
      className={cnStep(
        "flex min-w-0 items-start gap-3 rounded-lg border bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg",
        disabled ? "cursor-wait opacity-70" : "cursor-pointer",
        checked ? "border-sky-500 ring-2 ring-sky-100" : "border-slate-200 hover:border-sky-200",
      )}
    >
      <input
        type="radio"
        name="checkout-payment-schedule"
        checked={checked}
        onChange={() => {
          if (!disabled) onChange();
        }}
        disabled={disabled}
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
        aria-label={
          locale === "es"
            ? "Prefijo telefónico"
            : locale === "fr"
              ? "Indicatif téléphonique"
              : locale === "de"
                ? "Telefonvorwahl"
                : locale === "en"
                  ? "Phone country code"
                  : "Prefisso telefonico"
        }
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
              placeholder={locale === "es" ? "Buscar" : locale === "fr" ? "Rechercher" : locale === "de" ? "Suchen" : locale === "en" ? "Search" : "Cerca"}
              aria-label={
                locale === "es"
                  ? "Buscar prefijo"
                  : locale === "fr"
                    ? "Rechercher un indicatif"
                    : locale === "de"
                      ? "Vorwahl suchen"
                      : locale === "en"
                        ? "Search country code"
                        : "Cerca prefisso"
              }
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
                {locale === "es"
                  ? "No se ha encontrado ningún prefijo"
                  : locale === "fr"
                    ? "Aucun indicatif trouvé"
                    : locale === "de"
                      ? "Keine Vorwahl gefunden"
                      : locale === "en"
                        ? "No code found"
                        : "Nessun prefisso trovato"}
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
      <div className="grid grid-cols-[minmax(7.25rem,8.5rem)_minmax(0,1fr)] rounded-lg border border-gray-300 bg-white focus-within:border-sky-500 focus-within:ring-2 focus-within:ring-sky-100">
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
          placeholder={locale === "es" ? "612 345 678" : locale === "fr" ? "6 12 34 56 78" : locale === "de" ? "1512 3456789" : locale === "en" ? "7123 456789" : "333 123 4567"}
          className="min-w-0 px-4 py-3 text-base outline-none"
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
  billingDetails,
  onBillingDetailsChange,
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
  billingDetails: PrivateBillingDetails;
  onBillingDetailsChange: (v: PrivateBillingDetails) => void;
  onBack?: () => void;
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
  const countries = useMemo(() => localizedCountryOptions(locale), [locale]);
  const isItalianBilling = billingDetails.countryCode === "IT";
  const taxIdValid = isItalianBilling
    ? /^[A-Za-z0-9]{16}$/.test(billingDetails.taxId.trim())
    : true;
  const valid = Boolean(
    value.email.trim() &&
      value.firstName.trim() &&
      value.lastName.trim() &&
      hasNationalPhoneNumber(value.phone, locale) &&
      value.nationality.trim() &&
      billingDetails.countryCode.trim() &&
      billingDetails.addressLine1.trim() &&
      billingDetails.city.trim() &&
      billingDetails.postalCode.trim() &&
      (!isItalianBilling || billingDetails.province.trim()) &&
      taxIdValid,
  );
  return (
    <form
      className="flex min-h-0 flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !loading && consentPrivacy && consentTerms) onNext();
      }}
    >
      {onBack && (
        <div className="shrink-0">
          <button
            type="button"
            onClick={onBack}
            disabled={loading}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {copy.back}
          </button>
        </div>
      )}
      <div className="shrink-0">
        <h2 className="font-heading text-xl font-bold text-slate-950 sm:text-2xl">
          {copy.title}
        </h2>
      </div>
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
          placeholder={locale === "es" ? "tu@ejemplo.com" : locale === "fr" ? "vous@exemple.fr" : locale === "de" ? "sie@beispiel.de" : locale === "en" ? "you@example.com" : "mario@esempio.it"}
          required
          aria-required="true"
          autoComplete="email"
          className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
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
            className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
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
            className="w-full min-w-0 rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
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
      <div>
        <label htmlFor="wizard-nationality" className="mb-1 block text-sm font-medium">
          {copy.nationality}
        </label>
        <select
          id="wizard-nationality"
          required
          aria-required="true"
          autoComplete="off"
          value={value.nationality}
          onChange={(event) => onChange({ ...value, nationality: event.target.value })}
          className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
        >
          {countries.map((country) => (
            <option key={country.code} value={country.code}>
              {country.label}
            </option>
          ))}
        </select>
      </div>

      <fieldset className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/70 p-3 sm:p-4">
        <legend className="px-1 text-sm font-bold text-slate-900">{copy.billingTitle}</legend>
        <p className="text-xs leading-5 text-slate-600">{copy.billingDescription}</p>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="wizard-billing-country" className="mb-1 block text-sm font-medium">
              {copy.billingCountry}
            </label>
            <select
              id="wizard-billing-country"
              required
              aria-required="true"
              autoComplete="billing country"
              value={billingDetails.countryCode}
              onChange={(event) =>
                onBillingDetailsChange({
                  ...billingDetails,
                  countryCode: event.target.value,
                })
              }
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            >
              {countries.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="wizard-tax-id" className="mb-1 block text-sm font-medium">
              {isItalianBilling ? copy.taxIdItaly : copy.taxIdForeign}
            </label>
            <input
              id="wizard-tax-id"
              type="text"
              required={isItalianBilling}
              aria-required={isItalianBilling}
              minLength={isItalianBilling ? 16 : undefined}
              maxLength={isItalianBilling ? 16 : 64}
              pattern={isItalianBilling ? "[A-Za-z0-9]{16}" : undefined}
              autoCapitalize={isItalianBilling ? "characters" : "none"}
              spellCheck={false}
              value={billingDetails.taxId}
              onChange={(event) =>
                onBillingDetailsChange({
                  ...billingDetails,
                  taxId: isItalianBilling
                    ? event.target.value.toUpperCase()
                    : event.target.value,
                })
              }
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
            {!isItalianBilling && (
              <p className="mt-1 text-xs leading-4 text-slate-500">{copy.taxIdForeignHint}</p>
            )}
          </div>
        </div>

        <div>
          <label htmlFor="wizard-address-line-1" className="mb-1 block text-sm font-medium">
            {copy.addressLine1}
          </label>
          <input
            id="wizard-address-line-1"
            type="text"
            required
            aria-required="true"
            maxLength={200}
            autoComplete="billing address-line1"
            value={billingDetails.addressLine1}
            onChange={(event) =>
              onBillingDetailsChange({ ...billingDetails, addressLine1: event.target.value })
            }
            className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div>
          <label htmlFor="wizard-address-line-2" className="mb-1 block text-sm font-medium">
            {copy.addressLine2}
          </label>
          <input
            id="wizard-address-line-2"
            type="text"
            maxLength={200}
            autoComplete="billing address-line2"
            value={billingDetails.addressLine2}
            onChange={(event) =>
              onBillingDetailsChange({ ...billingDetails, addressLine2: event.target.value })
            }
            className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="wizard-city" className="mb-1 block text-sm font-medium">
              {copy.city}
            </label>
            <input
              id="wizard-city"
              type="text"
              required
              aria-required="true"
              maxLength={100}
              autoComplete="billing address-level2"
              value={billingDetails.city}
              onChange={(event) =>
                onBillingDetailsChange({ ...billingDetails, city: event.target.value })
              }
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label htmlFor="wizard-province" className="mb-1 block text-sm font-medium">
              {isItalianBilling ? copy.provinceItaly : copy.provinceForeign}
            </label>
            <input
              id="wizard-province"
              type="text"
              required={isItalianBilling}
              aria-required={isItalianBilling}
              maxLength={100}
              autoComplete="billing address-level1"
              value={billingDetails.province}
              onChange={(event) =>
                onBillingDetailsChange({ ...billingDetails, province: event.target.value })
              }
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
          <div>
            <label htmlFor="wizard-postal-code" className="mb-1 block text-sm font-medium">
              {copy.postalCode}
            </label>
            <input
              id="wizard-postal-code"
              type="text"
              required
              aria-required="true"
              maxLength={20}
              autoComplete="billing postal-code"
              value={billingDetails.postalCode}
              onChange={(event) =>
                onBillingDetailsChange({ ...billingDetails, postalCode: event.target.value })
              }
              className="w-full min-w-0 rounded-lg border border-gray-300 bg-white px-4 py-3 text-base focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-100"
            />
          </div>
        </div>
      </fieldset>
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

      <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={consentPrivacy}
            onChange={(e) => onConsentPrivacyChange(e.target.checked)}
            className="mt-1 size-5 shrink-0"
            required
          />
          <span className="min-w-0 leading-6">
            {copy.privacyPrefix}{" "}
            <a
              href={
                locale === "es"
                  ? "/es/privacidad"
                  : locale === "fr"
                    ? "/fr/confidentialite"
                    : locale === "de"
                      ? "/de/datenschutz"
                      : `/${locale}/privacy`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              {locale === "de"
                ? "Datenschutzerklärung"
                : locale === "fr"
                  ? "Politique de confidentialité"
                  : locale === "es"
                    ? "Política de privacidad"
                    : "Privacy Policy"}
            </a>
            . *
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={consentTerms}
            onChange={(e) => onConsentTermsChange(e.target.checked)}
            className="mt-1 size-5 shrink-0"
            required
          />
          <span className="min-w-0 leading-6">
            {copy.termsPrefix}{" "}
            <a
              href={
                locale === "es"
                  ? "/es/terminos-y-condiciones"
                  : locale === "fr"
                    ? "/fr/conditions-generales"
                    : locale === "de"
                      ? "/de/agb"
                      : `/${locale}/terms`
              }
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

      <div className="flex flex-col gap-3">
        <button
          type="submit"
          disabled={!valid || loading || !consentPrivacy || !consentTerms}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d97706] px-4 py-3 text-center font-black text-white shadow-lg shadow-amber-900/15 transition hover:bg-[#f2b84b] hover:text-[#06233a] disabled:opacity-50"
        >
          {loading ? copy.wait : copy.continueToPayment}
          {!loading && <CreditCard className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}
