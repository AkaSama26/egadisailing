"use client";

import { useEffect, useState } from "react";
import { StripePaymentForm } from "./stripe-payment-form";
import { TurnstileWidget } from "@/components/turnstile/turnstile-widget";
import { CURRENT_POLICY_VERSION } from "@/lib/legal/policy-version";

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

interface Props {
  locale: string;
  serviceId: string;
  serviceName: string;
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
  // R26-A1-C1: restore da sessionStorage al mount. Escludiamo "payment"/"success"
  // step — post-PI vogliamo sempre re-prompt per sicurezza (PI one-shot).
  const draft = typeof window !== "undefined" ? loadDraft(props.serviceId) : null;
  const restoredStep: Step =
    draft?.step === "people" || draft?.step === "customer" ? draft.step : "date";

  const [step, setStep] = useState<Step>(restoredStep);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(draft?.startDate ?? "");
  const [numPeople, setNumPeople] = useState<number>(draft?.numPeople ?? 1);
  const [customer, setCustomer] = useState<Customer>(
    draft?.customer ?? {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      nationality: "IT",
      language: "it",
    },
  );
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

  // R26-A1-C1: persist draft ad ogni change di step/input.
  useEffect(() => {
    if (step === "payment" || step === "success") return;
    saveDraft(props.serviceId, { step, startDate, numPeople, customer });
  }, [props.serviceId, step, startDate, numPeople, customer]);

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
          onChange={setStartDate}
          onNext={() => startDate && setStep("people")}
        />
      )}

      {step === "people" && (
        <PeopleStep
          capacityMax={props.capacityMax}
          value={numPeople}
          onChange={setNumPeople}
          onBack={() => setStep("date")}
          onNext={() => setStep("customer")}
        />
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
  onChange,
  onNext,
}: {
  value: string;
  onChange: (v: string) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-bold">Scegli la data</h2>
      {/* R24-A1-#13 WCAG 3.3.2: label esplicita per `date` input. */}
      <div>
        <label htmlFor="wizard-date" className="block text-sm font-medium mb-1">
          Data di partenza
        </label>
        <input
          id="wizard-date"
          type="date"
          required
          aria-required="true"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 rounded-lg border border-gray-300"
          min={new Date().toISOString().slice(0, 10)}
        />
      </div>
      <button
        onClick={onNext}
        disabled={!value}
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
