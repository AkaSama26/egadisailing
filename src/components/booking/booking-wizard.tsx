"use client";

import { useEffect, useState } from "react";
import { StripePaymentForm } from "./stripe-payment-form";
import { TurnstileWidget } from "@/components/turnstile/turnstile-widget";
import { CURRENT_POLICY_VERSION } from "@/lib/legal/policy-version";
import { checkOverrideEligibilityAction } from "@/lib/booking/override-check-action";

type Step = "date" | "people" | "customer" | "payment" | "success";

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
  numPeople: number;
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
}

interface Customer {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  nationality: string;
  language: string;
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
  const [numPeople, setNumPeople] = useState<number>(1);
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
  const charterDurationDays = isCharter ? inclusiveDaysBetween(startDate, endDate) : null;
  const effectiveDurationDays = isCharter ? charterDurationDays ?? durationDays : durationDays;
  const canContinueFromDate =
    !isCharter ||
    (charterDurationDays !== null && charterDurationDays >= 3 && charterDurationDays <= 7);

  // R26-A1-C1 + R26-P2-CRITICA: restore in useEffect client-side per evitare
  // hydration mismatch. Dopo restore marca `hydrated=true` → save effect puo'
  // procedere senza sovrascrivere draft precedente con stati default.
  useEffect(() => {
    const d = loadDraft(props.serviceId);
    if (props.initialStartDate) {
      setStartDate(props.initialStartDate);
      const nextDurationDays = props.initialDurationDays ?? 3;
      const nextEndDate = props.initialEndDate ?? addIsoDays(props.initialStartDate, nextDurationDays - 1);
      if (props.initialDurationDays) setDurationDays(props.initialDurationDays);
      if (isCharter) setEndDate(nextEndDate);
      setStep(isCharter && !props.initialDurationDays && !props.initialEndDate ? "date" : "people");
    } else if (d) {
      if (d.step === "people" || d.step === "customer") {
        setStep(d.step);
      }
      if (typeof d.startDate === "string") setStartDate(d.startDate);
      if (typeof d.endDate === "string") setEndDate(d.endDate);
      if (typeof d.durationDays === "number") setDurationDays(d.durationDays);
      if (typeof d.numPeople === "number") setNumPeople(d.numPeople);
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
    isCharter,
  ]);

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
      numPeople,
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
    numPeople,
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
          numPeople,
          customer,
          paymentSchedule: props.defaultPaymentSchedule,
          depositPercentage: props.defaultDepositPercentage ?? undefined,
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
        numPax: numPeople,
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
          // feature disabled → legacy flow, avanza normalmente
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
    <div className="bg-white rounded-2xl shadow-2xl p-8">
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
        <DateStep
          value={startDate}
          endValue={endDate}
          isCharter={isCharter}
          onChange={(value) => {
            setStartDate(value);
            if (endDate && value && endDate < addIsoDays(value, 2)) setEndDate("");
          }}
          onEndChange={setEndDate}
          onNext={() => setStep("people")}
          canContinue={Boolean(startDate) && canContinueFromDate}
        />
      )}

      {step === "people" && (
        <>
          <PeopleStep
            capacityMax={props.capacityMax}
            value={numPeople}
            onChange={setNumPeople}
            onBack={() => setStep("date")}
            onNext={() => void handleContinueFromPax()}
          />
          {overrideCheck.status === "checking" && (
            <div
              role="status"
              aria-live="polite"
              className="text-sm text-gray-600 pt-2"
            >
              Verifica disponibilita' in corso...
            </div>
          )}
          {overrideCheck.status === "blocked" && (
            <div
              role="alert"
              className="text-sm text-red-700 bg-red-50 border border-red-200 rounded p-3 mt-2"
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
          onNext={() => void createIntent()}
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

      {step === "payment" && intent && (
        <StripePaymentForm
          locale={props.locale}
          appUrl={props.appUrl}
          clientSecret={intent.clientSecret}
          confirmationCode={intent.confirmationCode}
          amountCents={intent.amountCents}
          onSuccess={() => {
            clearDraft(props.serviceId);
            setStep("success");
          }}
          onRetryNeeded={() => {
            // R15-UX-1: errore Stripe terminale (card_declined ecc). Il
            // clientSecret non e' piu' utilizzabile; torniamo allo step
            // customer per ricreare PI con nuovo metodo di pagamento.
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
          <h2 className="text-3xl font-bold text-emerald-600">Prenotazione confermata!</h2>
          <p className="text-lg">
            Codice: <strong>{intent.confirmationCode}</strong>
          </p>
          <p className="text-gray-600">Controlla la tua email per i dettagli.</p>
        </div>
      )}
    </div>
  );
}

function DateStep({
  value,
  endValue,
  isCharter,
  onChange,
  onEndChange,
  onNext,
  canContinue,
}: {
  value: string;
  endValue: string;
  isCharter: boolean;
  onChange: (v: string) => void;
  onEndChange: (v: string) => void;
  onNext: () => void;
  canContinue: boolean;
}) {
  const charterDurationDays = isCharter ? inclusiveDaysBetween(value, endValue) : null;
  const charterIsTooShort =
    isCharter &&
    Boolean(value && endValue) &&
    (charterDurationDays === null || charterDurationDays < 3);
  const charterIsTooLong = isCharter && charterDurationDays !== null && charterDurationDays > 7;
  const endMin = value ? addIsoDays(value, 2) : new Date().toISOString().slice(0, 10);

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Scegli le date</h2>
      {/* R24-A1-#13 WCAG 3.3.2: label esplicita per `date` input. */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="wizard-date"
          className="w-8 shrink-0 text-right text-sm font-medium text-gray-600"
        >
          Da
        </label>
        <input
          id="wizard-date"
          type="date"
          required
          aria-required="true"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 px-4 py-3 rounded-lg border border-gray-300"
          min={new Date().toISOString().slice(0, 10)}
        />
      </div>
      {isCharter && (
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
        type="button"
        onClick={onNext}
        disabled={!canContinue}
        className="w-full py-3 rounded-full bg-[#d97706] text-white font-bold disabled:opacity-50"
      >
        Avanti
      </button>
    </div>
  );
}

function PeopleStep({
  capacityMax,
  value,
  onChange,
  onBack,
  onNext,
}: {
  capacityMax: number;
  value: number;
  onChange: (n: number) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Quante persone?</h2>
      {/* R24-A1-#13 WCAG 3.3.2: label + aria-describedby per max hint. */}
      <div>
        <label htmlFor="wizard-people" className="block text-sm font-medium mb-1">
          Numero persone
        </label>
        <input
          id="wizard-people"
          type="number"
          min={1}
          max={capacityMax}
          required
          aria-required="true"
          aria-describedby="wizard-people-hint"
          value={value}
          onChange={(e) => onChange(Math.max(1, Math.min(capacityMax, parseInt(e.target.value, 10) || 1)))}
          className="w-full px-4 py-3 rounded-lg border border-gray-300"
        />
      </div>
      <p id="wizard-people-hint" className="text-sm text-gray-600">Massimo {capacityMax} persone</p>
      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 rounded-full border border-gray-300 font-semibold"
        >
          Indietro
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 rounded-full bg-[#d97706] text-white font-bold"
        >
          Avanti
        </button>
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
  const valid = value.email && value.firstName && value.lastName;
  return (
    <div className="space-y-4">
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
          Telefono <span className="text-gray-500 font-normal">(opzionale)</span>
        </label>
        <input
          id="wizard-phone"
          type="tel"
          autoComplete="tel"
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
          onClick={onBack}
          disabled={loading}
          className="flex-1 py-3 rounded-full border border-gray-300 font-semibold disabled:opacity-50"
        >
          Indietro
        </button>
        <button
          onClick={onNext}
          disabled={!valid || loading || !consentPrivacy || !consentTerms}
          className="flex-1 py-3 rounded-full bg-[#d97706] text-white font-bold disabled:opacity-50"
        >
          {loading ? "Attendere..." : "Procedi al pagamento"}
        </button>
      </div>
    </div>
  );
}
