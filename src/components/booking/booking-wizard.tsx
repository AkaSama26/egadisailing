"use client";

import { useState } from "react";
import { StripePaymentForm } from "./stripe-payment-form";
import { TurnstileWidget } from "@/components/turnstile/turnstile-widget";

type Step = "date" | "people" | "customer" | "payment" | "success";

// Versione della privacy+T&C attualmente in vigore. Sincronizzare con
// EFFECTIVE_DATE/POLICY_VERSION nelle pagine /privacy e /terms se aggiornate.
const POLICY_VERSION = "1.0";

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
  const [step, setStep] = useState<Step>("date");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [numPeople, setNumPeople] = useState(1);
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
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentTerms, setConsentTerms] = useState(false);

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
          startDate: new Date(startDate).toISOString(),
          numPeople,
          customer,
          paymentSchedule: props.defaultPaymentSchedule,
          depositPercentage: props.defaultDepositPercentage ?? undefined,
          turnstileToken: turnstileToken ?? undefined,
          consent: {
            privacyAccepted: consentPrivacy,
            termsAccepted: consentTerms,
            policyVersion: POLICY_VERSION,
          },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Errore creazione prenotazione");
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
          clientSecret={intent.clientSecret}
          confirmationCode={intent.confirmationCode}
          amountCents={intent.amountCents}
          onSuccess={() => setStep("success")}
          onRetryNeeded={() => {
            // R15-UX-1: errore Stripe terminale (card_declined ecc). Il
            // clientSecret non e' piu' utilizzabile; torniamo allo step
            // customer per ricreare PI con nuovo metodo di pagamento.
            setIntent(null);
            setTurnstileToken(null);
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
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border border-gray-300"
        min={new Date().toISOString().slice(0, 10)}
      />
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
      <input
        type="number"
        min={1}
        max={capacityMax}
        value={value}
        onChange={(e) => onChange(Math.max(1, Math.min(capacityMax, parseInt(e.target.value, 10) || 1)))}
        className="w-full px-4 py-3 rounded-lg border border-gray-300"
      />
      <p className="text-sm text-gray-600">Massimo {capacityMax} persone</p>
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
      <input
        type="email"
        placeholder="Email"
        required
        className="w-full px-4 py-3 rounded-lg border border-gray-300"
        value={value.email}
        onChange={(e) => onChange({ ...value, email: e.target.value })}
      />
      <div className="grid grid-cols-2 gap-3">
        <input
          type="text"
          placeholder="Nome"
          required
          className="px-4 py-3 rounded-lg border border-gray-300"
          value={value.firstName}
          onChange={(e) => onChange({ ...value, firstName: e.target.value })}
        />
        <input
          type="text"
          placeholder="Cognome"
          required
          className="px-4 py-3 rounded-lg border border-gray-300"
          value={value.lastName}
          onChange={(e) => onChange({ ...value, lastName: e.target.value })}
        />
      </div>
      <input
        type="tel"
        placeholder="Telefono (opzionale)"
        className="w-full px-4 py-3 rounded-lg border border-gray-300"
        value={value.phone}
        onChange={(e) => onChange({ ...value, phone: e.target.value })}
      />
      {turnstileSiteKey && (
        <TurnstileWidget
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
