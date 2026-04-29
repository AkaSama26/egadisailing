"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { ArrowLeft, Baby, CalendarDays, Check, ChevronLeft, ChevronRight, CreditCard, ReceiptText, UserRound, Users } from "lucide-react";
import { StripePaymentForm } from "./stripe-payment-form";
import { TurnstileWidget } from "@/components/turnstile/turnstile-widget";
import { CURRENT_POLICY_VERSION } from "@/lib/legal/policy-version";
import { checkOverrideEligibilityAction } from "@/lib/booking/override-check-action";

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

function monthLabel(monthIso: string): string {
  const date = new Date(`${monthIso}-01T00:00:00.000Z`);
  return new Intl.DateTimeFormat("it-IT", {
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
}

interface Customer {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  nationality: string;
  language: string;
}

interface PassengerBreakdown {
  adults: number;
  children: number;
  freeChildren: number;
  infants: number;
}

interface SelectedPrice {
  amount: number;
  pricingUnit: string;
}

function defaultPassengers(): PassengerBreakdown {
  return { adults: 1, children: 0, freeChildren: 0, infants: 0 };
}

function occupiedSeats(passengers: PassengerBreakdown): number {
  return passengers.adults + passengers.children + passengers.freeChildren;
}

function paidUnitsForClient(serviceType: string, passengers: PassengerBreakdown): number {
  if (serviceType === "BOAT_SHARED") return passengers.adults + passengers.children * 0.5;
  return occupiedSeats(passengers);
}

function formatClientEur(amount: number): string {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatIsoDateLabel(isoDate: string): string {
  if (!isoDate) return "-";
  return new Intl.DateTimeFormat("it-IT", {
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
  if (selectedPrice.pricingUnit === "PER_PACKAGE") return selectedPrice.amount;
  return selectedPrice.amount * paidUnitsForClient(serviceType, passengers);
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

function formatClientCents(cents: number): string {
  return formatClientEur(cents / 100);
}

export function BookingWizard(props: Props) {
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
  const charterDurationDays = isCharter ? inclusiveDaysBetween(startDate, endDate) : null;
  const effectiveDurationDays = isCharter
    ? fixedDurationDays ?? charterDurationDays ?? durationDays
    : durationDays;
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

  async function createIntent() {
    setError(null);
    if (!consentPrivacy || !consentTerms) {
      setError("Accetta Privacy Policy e Termini & Condizioni per continuare");
      return;
    }
    // In prod il server richiede Turnstile token (enforce). In dev passa senza.
    if (props.turnstileSiteKey && !turnstileToken) {
      setError("Completa la verifica CAPTCHA prima di continuare");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/payment-intent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
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
              ? `Troppe richieste. Riprova tra ${retry}s.${idSuffix}`
              : `Troppe richieste, riprova tra qualche minuto.${idSuffix}`,
          );
        }
        if (res.status === 409) {
          throw new Error(
            `Queste date non sono piu' disponibili. Prova a sceglierne altre.${idSuffix}`,
          );
        }
        if (res.status >= 500) {
          throw new Error(
            `Problema tecnico momentaneo. Riprova tra qualche minuto o scrivici a info@egadisailing.com.${idSuffix}`,
          );
        }
        // Default (400/403/404 non intercettati sopra): usa messaggio server
        // (gia' italiano per i ValidationError dei nostri schemas Zod).
        throw new Error(
          (body?.error?.message ?? "Errore creazione prenotazione") + idSuffix,
        );
      }
      const body = await res.json();
      const payload = body.data ?? body; // tolleranza per envelope old/new
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
        numPax: occupiedSeats(passengers),
      });
      if (result.status === "blocked") {
        const reasonMsg =
          result.reason === "within_15_day_cutoff"
            ? "Questa data non e' piu' disponibile — troppo vicina all'esperienza (meno di 15 giorni)."
            : result.reason === "insufficient_revenue"
            ? "Questa data e' gia' prenotata. Prova un'altra data."
            : result.reason === "boat_block"
            ? "Questa data e' stata bloccata dall'amministrazione (manutenzione)."
            : result.reason === "external_booking"
            ? "Questa data e' gia' occupata da una prenotazione confermata su un portale esterno. Prova un'altra data."
            : result.reason === "feature_disabled"
            ? // Feature flag OFF: comportamento legacy — procediamo allo step
              // successivo, il controllo vero avverra' al createPendingDirectBooking.
              null
            : "Questa data non e' disponibile per questo pacchetto.";
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
            ? `Errore verifica disponibilita': ${err.message}`
            : "Errore verifica disponibilita'. Riprova.",
      });
    }
  }

  return (
    <div className="overflow-hidden rounded-lg bg-white shadow-2xl">
      <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700">
          Checkout diretto
        </p>
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-2xl font-heading font-bold text-slate-950">
              {props.serviceName}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              Data, ospiti, dati cliente e pagamento online.
            </p>
          </div>
          <StepIndicator step={step} />
        </div>
      </div>

      <div className="p-5 sm:p-8">
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
            capacityMax={props.capacityMax}
            serviceType={props.serviceType}
            value={passengers}
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
              Verifica disponibilita&apos; in corso...
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
          <h2 className="text-3xl font-bold text-emerald-600">Pagamento completato</h2>
          <p className="text-lg">
            Codice: <strong>{intent.confirmationCode}</strong>
          </p>
          <p className="text-gray-600">
            Stiamo finalizzando la prenotazione sul sistema centrale. Controlla la tua
            email per i dettagli.
          </p>
          <a
            href={`/${props.locale}/prenota/success/${intent.confirmationCode}`}
            className="inline-flex items-center justify-center rounded-full bg-slate-900 px-5 py-2.5 text-sm font-bold text-white hover:bg-slate-700"
          >
            Apri riepilogo
          </a>
        </div>
      )}
      </div>
    </div>
  );
}

function StepIndicator({ step }: { step: Step }) {
  const activeIndex = step === "success" ? CHECKOUT_STEPS.length : CHECKOUT_STEPS.findIndex((item) => item.key === step);

  return (
    <ol className="grid grid-cols-5 gap-1 text-xs font-semibold text-slate-500" aria-label="Stato checkout">
      {CHECKOUT_STEPS.map((item, index) => {
        const Icon = item.icon;
        const active = index === activeIndex;
        const complete = index < activeIndex;
        return (
          <li
            key={item.key}
            className={cnStep(
              "flex min-w-0 items-center justify-center gap-1.5 rounded-full px-2 py-2",
              active && "bg-sky-100 text-sky-900",
              complete && "bg-emerald-50 text-emerald-700",
            )}
            aria-current={active ? "step" : undefined}
          >
            {complete ? <Check className="size-3.5 shrink-0" aria-hidden="true" /> : <Icon className="size-3.5 shrink-0" aria-hidden="true" />}
            <span className="truncate">{item.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

function cnStep(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
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

function calendarDayAriaLabel(date: string, day?: CalendarApiDay): string {
  const formatted = new Intl.DateTimeFormat("it-IT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
  if (!day) return `${formatted}, caricamento disponibilita'`;
  const price = day.priceLabel ? `, ${day.priceLabel}` : "";
  return `${formatted}, ${day.reasonLabel ?? "non disponibile"}${price}`;
}

function calendarDayClass({
  selected,
  outOfMonth,
  status,
  loading,
}: {
  selected: boolean;
  outOfMonth: boolean;
  status?: CalendarApiDay["status"];
  loading: boolean;
}): string {
  return cnStep(
    "min-h-[76px] rounded-md border p-1.5 text-left transition focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:cursor-not-allowed",
    selected &&
      "border-sky-700 bg-sky-700 text-white shadow-sm ring-2 ring-sky-200 hover:bg-sky-800",
    !selected && !status && "border-slate-200 bg-white text-slate-400",
    !selected &&
      status === "available" &&
      "border-emerald-200 bg-white text-slate-950 hover:bg-emerald-50",
    !selected &&
      status === "request" &&
      "border-amber-200 bg-amber-50 text-amber-950 hover:bg-amber-100",
    !selected && status === "unavailable" && "border-slate-200 bg-slate-100 text-slate-400",
    outOfMonth && !selected && "opacity-55",
    loading && "animate-pulse",
  );
}

function DateStep({
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
  const [visibleMonth, setVisibleMonth] = useState(() =>
    monthKeyFromIso(value || new Date().toISOString().slice(0, 10)),
  );
  const [calendarDays, setCalendarDays] = useState<Record<string, CalendarApiDay>>({});
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const charterDurationDays = isCharter ? inclusiveDaysBetween(value, endValue) : null;
  const charterIsTooShort =
    isCharter &&
    Boolean(value && endValue) &&
    (charterDurationDays === null || charterDurationDays < 3);
  const charterIsTooLong = isCharter && charterDurationDays !== null && charterDurationDays > 7;
  const endMin = value ? addIsoDays(value, 2) : new Date().toISOString().slice(0, 10);
  const fixedEndDate =
    isCharter && fixedDurationDays && value ? addIsoDays(value, fixedDurationDays - 1) : "";
  const range = useMemo(() => calendarRange(visibleMonth), [visibleMonth]);
  const currentMonth = new Date().toISOString().slice(0, 7);
  const canGoPrevious = visibleMonth > currentMonth;

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      serviceId,
      start: range.start,
      end: range.end,
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
        if (!res.ok) throw new Error("Calendario non disponibile");
        const body = (await res.json()) as { data?: { days?: CalendarApiDay[] } };
        const next: Record<string, CalendarApiDay> = {};
        for (const day of body.data?.days ?? []) {
          next[day.date] = day;
        }
        setCalendarDays(next);
      })
      .catch((err) => {
        if ((err as Error).name !== "AbortError") {
          setCalendarError("Non riesco a caricare disponibilita' e prezzi. Riprova tra poco.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setCalendarLoading(false);
      });

    return () => controller.abort();
  }, [fixedDurationDays, isCharter, range.end, range.start, serviceId]);

  useEffect(() => {
    const day = value ? calendarDays[value] : null;
    if (day?.priceAmount != null && day.pricingUnit) {
      onPriceChange({ amount: day.priceAmount, pricingUnit: day.pricingUnit });
    } else {
      onPriceChange(null);
    }
  }, [calendarDays, onPriceChange, value]);

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (canContinue) onNext();
      }}
    >
      <h2 className="text-2xl font-bold">Scegli una data disponibile</h2>
      <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <legend className="sr-only">Calendario disponibilita&apos; e prezzi</legend>
        <div className="mb-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => shiftMonth(month, -1))}
            disabled={!canGoPrevious}
            className="inline-flex size-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700 disabled:opacity-40"
            aria-label="Mese precedente"
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </button>
          <p className="text-base font-bold capitalize text-slate-950">{monthLabel(visibleMonth)}</p>
          <button
            type="button"
            onClick={() => setVisibleMonth((month) => shiftMonth(month, 1))}
            className="inline-flex size-10 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-700"
            aria-label="Mese successivo"
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold uppercase text-slate-500">
          {["Lun", "Mar", "Mer", "Gio", "Ven", "Sab", "Dom"].map((day) => (
            <div key={day} className="py-1">
              {day}
            </div>
          ))}
        </div>
        <div className="mt-1 grid grid-cols-7 gap-1">
          {range.days.map((date) => {
            const day = calendarDays[date];
            const outOfMonth = monthKeyFromIso(date) !== visibleMonth;
            const selected = value === date;
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
                aria-pressed={selected}
                aria-label={calendarDayAriaLabel(date, day)}
                className={calendarDayClass({
                  selected,
                  outOfMonth,
                  status: day?.status,
                  loading: calendarLoading && !day,
                })}
              >
                <span className="text-sm font-bold">{Number(date.slice(8, 10))}</span>
                <span className="mt-1 block min-h-4 text-[11px] font-semibold leading-tight">
                  {day?.priceLabel ?? (calendarLoading ? "..." : "")}
                </span>
                <span className="mt-0.5 block min-h-4 text-[10px] leading-tight">
                  {day?.reasonLabel ?? ""}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500" aria-hidden="true" />
            Libera
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-amber-500" aria-hidden="true" />
            Su richiesta
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-slate-300" aria-hidden="true" />
            Non disponibile
          </span>
        </div>
        {calendarError && (
          <p role="alert" className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {calendarError}
          </p>
        )}
      </fieldset>
      {value && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
          Data selezionata: {value}
        </p>
      )}
      {isCharter && fixedDurationDays && (
        <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-medium text-sky-900">
          Durata selezionata: {fixedDurationDays} giornate
          {fixedEndDate ? `, fino al ${fixedEndDate}` : ""}.
        </p>
      )}
      {isCharter && !fixedDurationDays && (
        <>
          <div className="flex items-center gap-3">
            <label
              htmlFor="wizard-end-date"
              className="w-8 shrink-0 text-right text-sm font-medium text-gray-600"
            >
              A
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
              Il charter richiede almeno 3 giornate.
            </p>
          )}
          {charterIsTooLong && (
            <p className="rounded-lg bg-sky-50 px-3 py-2 text-sm font-medium text-sky-800">
              Per charter più lunghi di 7 giornate contatta la crew per un preventivo dedicato.
            </p>
          )}
        </>
      )}
      <button
        type="submit"
        disabled={!canContinue}
        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d97706] py-3 font-bold text-white disabled:opacity-50"
      >
        Avanti
        <ChevronRight className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}

function PeopleStep({
  capacityMax,
  serviceType,
  value,
  selectedPrice,
  onChange,
  onBack,
  onNext,
  checking,
}: {
  capacityMax: number;
  serviceType: string;
  value: PassengerBreakdown;
  selectedPrice: SelectedPrice | null;
  onChange: (n: PassengerBreakdown) => void;
  onBack?: () => void;
  onNext: () => void;
  checking?: boolean;
}) {
  const seats = occupiedSeats(value);
  const paidUnits = paidUnitsForClient(serviceType, value);
  const totalGuests = seats + value.infants;
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
      <h2 className="text-2xl font-bold">Chi sale a bordo?</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <PassengerCounter
          id="wizard-adults"
          label="Adulti"
          hint="10+ anni"
          value={value.adults}
          min={0}
          icon={<Users className="size-4" aria-hidden="true" />}
          onChange={(n) => update("adults", n)}
        />
        <PassengerCounter
          id="wizard-children"
          label="Bambini"
          hint="5-9 anni, meta' prezzo"
          value={value.children}
          min={0}
          icon={<Users className="size-4" aria-hidden="true" />}
          onChange={(n) => update("children", n)}
        />
        <PassengerCounter
          id="wizard-free-children"
          label="Bimbi piccoli"
          hint="3-4 anni, gratis con posto"
          value={value.freeChildren}
          min={0}
          icon={<Baby className="size-4" aria-hidden="true" />}
          onChange={(n) => update("freeChildren", n)}
        />
        <PassengerCounter
          id="wizard-infants"
          label="Neonati"
          hint="0-2 anni, senza posto"
          value={value.infants}
          min={0}
          icon={<Baby className="size-4" aria-hidden="true" />}
          onChange={(n) => update("infants", n)}
        />
      </div>
      <div
        className={cnStep(
          "grid gap-3 rounded-lg border p-3 text-sm sm:grid-cols-3",
          capacityExceeded ? "border-red-200 bg-red-50 text-red-800" : "border-slate-200 bg-slate-50 text-slate-700",
        )}
      >
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">Posti occupati</div>
          <div className="font-bold tabular-nums">{seats} / {capacityMax}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">Quote paganti</div>
          <div className="font-bold tabular-nums">{paidUnits.toLocaleString("it-IT")}</div>
        </div>
        <div>
          <div className="text-xs font-semibold uppercase text-slate-500">Totale stimato</div>
          <div className="font-bold tabular-nums">
            {estimatedTotal != null ? formatClientEur(estimatedTotal) : "In caricamento"}
          </div>
        </div>
      </div>
      {totalGuests > 0 && (
        <p id="wizard-people-hint" className="text-sm text-gray-600">
          Totale ospiti: {totalGuests}. I neonati 0-2 non occupano posto.
        </p>
      )}
      {capacityExceeded && (
        <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          Hai selezionato piu&apos; posti della capacita&apos; disponibile.
        </p>
      )}
      <div className="flex gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            disabled={checking}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-300 py-3 font-semibold disabled:opacity-50"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Indietro
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#d97706] py-3 font-bold text-white disabled:opacity-50"
        >
          {checking ? "Verifica..." : "Avanti"}
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
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  min: number;
  icon: ReactNode;
  onChange: (n: number) => void;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-full bg-slate-100 text-slate-700">
          {icon}
        </span>
        <div>
          <label htmlFor={id} className="block text-sm font-bold text-slate-950">
            {label}
          </label>
          <p className="text-xs text-slate-500">{hint}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(value - 1)}
          disabled={value <= min}
          className="inline-flex size-10 items-center justify-center rounded-full border border-slate-300 font-bold disabled:opacity-40"
          aria-label={`Diminuisci ${label}`}
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
          className="h-10 min-w-0 flex-1 rounded-md border border-slate-300 text-center font-bold tabular-nums"
        />
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="inline-flex size-10 items-center justify-center rounded-full border border-slate-300 font-bold"
          aria-label={`Aumenta ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}

function ReviewStep({
  serviceName,
  serviceType,
  durationType,
  durationHours,
  startDate,
  endDate,
  durationDays,
  passengers,
  customer,
  selectedPrice,
  paymentSchedule,
  depositPercentage,
  onPaymentScheduleChange,
  loading,
  onBack,
  onConfirm,
}: {
  serviceName: string;
  serviceType: string;
  durationType: string;
  durationHours: number;
  startDate: string;
  endDate: string;
  durationDays?: number;
  passengers: PassengerBreakdown;
  customer: Customer;
  selectedPrice: SelectedPrice | null;
  paymentSchedule: CheckoutPaymentSchedule;
  depositPercentage: number;
  onPaymentScheduleChange: (schedule: CheckoutPaymentSchedule) => void;
  loading: boolean;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const totalAmount = estimateTotalAmount(serviceType, passengers, selectedPrice);
  const payment = estimatePaymentBreakdown(totalAmount, paymentSchedule, depositPercentage);
  const seats = occupiedSeats(passengers);
  const totalGuests = seats + passengers.infants;
  const paidUnits = paidUnitsForClient(serviceType, passengers);
  const durationLabel =
    durationType === "MULTI_DAY" && durationDays
      ? `${durationDays} giornate`
      : durationHours >= 24
        ? `${Math.ceil(durationHours / 24)} giornate`
        : `${durationHours} ore`;
  const dateLabel =
    endDate && endDate !== startDate
      ? `${formatIsoDateLabel(startDate)} - ${formatIsoDateLabel(endDate)}`
      : formatIsoDateLabel(startDate);

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
          Controlla prima di pagare
        </p>
        <h2 className="mt-1 text-2xl font-bold">Riepilogo prenotazione</h2>
        <p className="mt-1 text-sm text-slate-600">
          Il pagamento verra&apos; aperto su Stripe solo dopo questa conferma.
        </p>
      </div>

      <fieldset className="rounded-lg border border-slate-200 bg-slate-50 p-3 sm:p-4">
        <legend className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
          Come vuoi pagare?
        </legend>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <PaymentChoiceCard
            checked={paymentSchedule === "DEPOSIT_BALANCE"}
            title={`Acconto ${depositPercentage}%`}
            badge="Consigliato"
            description="Blocchi subito la data pagando solo l'acconto."
            amount={
              payment
                ? formatClientCents(Math.round((payment.totalCents * depositPercentage) / 100))
                : "In calcolo"
            }
            onChange={() => onPaymentScheduleChange("DEPOSIT_BALANCE")}
          />
          <PaymentChoiceCard
            checked={paymentSchedule === "FULL"}
            title="Pagamento completo"
            description="Saldi tutta la prenotazione adesso con carta."
            amount={payment ? formatClientCents(payment.totalCents) : "In calcolo"}
            onChange={() => onPaymentScheduleChange("FULL")}
          />
        </div>
        {paymentSchedule === "DEPOSIT_BALANCE" && (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-900">
            L&apos;acconto non e&apos; rimborsabile. Il saldo restante verra&apos;
            pagato in loco prima della partenza; i contanti sono preferiti.
          </p>
        )}
      </fieldset>

      <div className="grid gap-3 md:grid-cols-2">
        <ReviewPanel title="Esperienza">
          <ReviewRow label="Pacchetto" value={serviceName} />
          <ReviewRow label="Data" value={dateLabel} />
          <ReviewRow label="Durata" value={durationLabel} />
        </ReviewPanel>

        <ReviewPanel title="Ospiti">
          <ReviewRow label="Adulti" value={String(passengers.adults)} />
          <ReviewRow label="Bambini 5-9" value={String(passengers.children)} />
          <ReviewRow label="Bimbi 3-4" value={String(passengers.freeChildren)} />
          <ReviewRow label="Neonati 0-2" value={String(passengers.infants)} />
          <ReviewRow label="Posti occupati" value={String(seats)} />
          <ReviewRow label="Quote paganti" value={paidUnits.toLocaleString("it-IT")} />
          <ReviewRow label="Ospiti totali" value={String(totalGuests)} />
        </ReviewPanel>

        <ReviewPanel title="Dati cliente">
          <ReviewRow label="Nome" value={`${customer.firstName} ${customer.lastName}`.trim()} />
          <ReviewRow label="Email" value={customer.email} />
          <ReviewRow label="Telefono" value={customer.phone} />
        </ReviewPanel>

        <ReviewPanel title="Pagamento">
          {payment ? (
            <>
              <ReviewRow label="Totale prenotazione" value={formatClientCents(payment.totalCents)} />
              <ReviewRow
                label={
                  paymentSchedule === "DEPOSIT_BALANCE"
                    ? `Da pagare ora (${payment.depositPercentage}%)`
                    : "Da pagare ora"
                }
                value={formatClientCents(payment.upfrontCents)}
                strong
              />
              {payment.balanceCents > 0 && (
                <ReviewRow label="Saldo in loco" value={formatClientCents(payment.balanceCents)} />
              )}
            </>
          ) : (
            <p className="text-sm text-amber-700">
              Prezzo non ancora disponibile. Torna alla data e seleziona una giornata con listino.
            </p>
          )}
        </ReviewPanel>
      </div>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-600">
        Il totale definitivo viene ricalcolato dal server al momento della conferma,
        usando disponibilita&apos;, listino e sconti configurati. Il saldo, se presente,
        si paga solo in loco prima della partenza.
      </p>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-300 py-3 font-semibold disabled:opacity-50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Modifica dati
        </button>
        <button
          type="submit"
          disabled={!payment || loading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#d97706] py-3 font-bold text-white disabled:opacity-50"
        >
          {loading ? "Creo il pagamento..." : "Conferma e vai a Stripe"}
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
        "flex cursor-pointer gap-3 rounded-lg border bg-white p-4 transition",
        checked ? "border-sky-500 ring-2 ring-sky-100" : "border-slate-200 hover:border-sky-200",
      )}
    >
      <input
        type="radio"
        name="checkout-payment-schedule"
        checked={checked}
        onChange={onChange}
        className="mt-1 size-4"
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
        <span className="mt-3 block text-lg font-bold text-slate-950">{amount}</span>
      </span>
    </label>
  );
}

function ReviewPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white p-4">
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">{title}</h3>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function ReviewRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span
        className={cnStep(
          "max-w-[60%] text-right text-slate-900",
          strong && "text-base font-bold",
        )}
      >
        {value || "-"}
      </span>
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
  const valid = Boolean(
    value.email.trim() &&
      value.firstName.trim() &&
      value.lastName.trim() &&
      value.phone.trim(),
  );
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !loading && consentPrivacy && consentTerms) onNext();
      }}
    >
      <h2 className="text-2xl font-bold">I tuoi dati</h2>
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
          placeholder="mario@esempio.it"
          required
          aria-required="true"
          autoComplete="email"
          className="w-full px-4 py-3 rounded-lg border border-gray-300"
          value={value.email}
          onChange={(e) => onChange({ ...value, email: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="wizard-first-name" className="block text-sm font-medium mb-1">
            Nome
          </label>
          <input
            id="wizard-first-name"
            type="text"
            required
            aria-required="true"
            autoComplete="given-name"
            className="w-full px-4 py-3 rounded-lg border border-gray-300"
            value={value.firstName}
            onChange={(e) => onChange({ ...value, firstName: e.target.value })}
          />
        </div>
        <div>
          <label htmlFor="wizard-last-name" className="block text-sm font-medium mb-1">
            Cognome
          </label>
          <input
            id="wizard-last-name"
            type="text"
            required
            aria-required="true"
            autoComplete="family-name"
            className="w-full px-4 py-3 rounded-lg border border-gray-300"
            value={value.lastName}
            onChange={(e) => onChange({ ...value, lastName: e.target.value })}
          />
        </div>
      </div>
      <div>
        <label htmlFor="wizard-phone" className="block text-sm font-medium mb-1">
          Telefono
        </label>
        <input
          id="wizard-phone"
          type="tel"
          required
          aria-required="true"
          autoComplete="tel"
          placeholder="+39 333 123 4567"
          className="w-full px-4 py-3 rounded-lg border border-gray-300"
          value={value.phone}
          onChange={(e) => onChange({ ...value, phone: e.target.value })}
        />
      </div>
      {turnstileSiteKey && (
        <TurnstileWidget
          // R26-A1-C2: key cambia su onRetryNeeded → remount forzato →
          // widget re-challenge Cloudflare (evita token stale post-cardDeclined).
          key={turnstileResetKey}
          siteKey={turnstileSiteKey}
          onToken={onTurnstileToken}
          onExpired={onTurnstileExpired}
        />
      )}

      <div className="space-y-2 text-sm border-t pt-4">
        <label className="flex items-start gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={consentPrivacy}
            onChange={(e) => onConsentPrivacyChange(e.target.checked)}
            className="mt-1 size-4"
            required
          />
          <span>
            Ho letto e accetto la{" "}
            <a
              href={`/${locale}/privacy`}
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
            className="mt-1 size-4"
            required
          />
          <span>
            Accetto i{" "}
            <a
              href={`/${locale}/terms`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 underline"
            >
              Termini &amp; Condizioni
            </a>{" "}
            di prenotazione, inclusa la policy di cancellazione. *
          </span>
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-gray-300 py-3 font-semibold disabled:opacity-50"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Indietro
        </button>
        <button
          type="submit"
          disabled={!valid || loading || !consentPrivacy || !consentTerms}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#d97706] py-3 font-bold text-white disabled:opacity-50"
        >
          {loading ? "Attendere..." : "Procedi al pagamento"}
          {!loading && <CreditCard className="size-4" aria-hidden="true" />}
        </button>
      </div>
    </form>
  );
}
