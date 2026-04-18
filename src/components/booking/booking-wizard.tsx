"use client";

import { useState } from "react";
import { StripePaymentForm } from "./stripe-payment-form";

type Step = "date" | "people" | "customer" | "payment" | "success";

interface Props {
  locale: string;
  serviceId: string;
  serviceName: string;
  durationType: string;
  durationHours: number;
  capacityMax: number;
  defaultPaymentSchedule: "FULL" | "DEPOSIT_BALANCE";
  defaultDepositPercentage: number | null;
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

  async function createIntent() {
    setError(null);
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
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error?.message ?? "Errore creazione prenotazione");
      }
      const data = await res.json();
      setIntent({
        confirmationCode: data.confirmationCode,
        clientSecret: data.clientSecret,
        amountCents: data.amountCents,
        totalCents: data.totalCents,
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
          value={customer}
          onChange={setCustomer}
          onBack={() => setStep("people")}
          onNext={() => void createIntent()}
          loading={loading}
        />
      )}

      {step === "payment" && intent && (
        <StripePaymentForm
          locale={props.locale}
          clientSecret={intent.clientSecret}
          confirmationCode={intent.confirmationCode}
          amountCents={intent.amountCents}
          onSuccess={() => setStep("success")}
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
  value,
  onChange,
  onBack,
  onNext,
  loading,
}: {
  value: Customer;
  onChange: (v: Customer) => void;
  onBack: () => void;
  onNext: () => void;
  loading: boolean;
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
          disabled={!valid || loading}
          className="flex-1 py-3 rounded-full bg-[#d97706] text-white font-bold disabled:opacity-50"
        >
          {loading ? "Attendere..." : "Procedi al pagamento"}
        </button>
      </div>
    </div>
  );
}
