"use client";

import { useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { CreditCard, LockKeyhole, ShieldCheck } from "lucide-react";

let stripePromise: Promise<Stripe | null> | null = null;

function getStripe(): Promise<Stripe | null> {
  if (!stripePromise) {
    const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!key) {
      stripePromise = Promise.resolve(null);
    } else {
      stripePromise = loadStripe(key);
    }
  }
  return stripePromise;
}

interface Props {
  locale: string;
  /** R26-A1-A4: canonical APP_URL per Stripe return_url — evita drift da
   *  `window.location.origin` se utente arriva da host non-canonical. */
  appUrl: string;
  customer: {
    email: string;
    firstName: string;
    lastName: string;
    phone: string;
  };
  clientSecret: string;
  confirmationCode: string;
  amountCents: number;
  totalCents: number;
  balanceCents: number;
  onSuccess: () => void;
  /** Chiamato quando il PaymentIntent e' in stato terminale non-retryable
   *  (`card_declined`, `expired_card`). Il wizard deve ricreare un nuovo
   *  PaymentIntent per permettere un secondo tentativo. R15-UX-1. */
  onRetryNeeded?: () => void;
}

export function StripePaymentForm(props: Props) {
  const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
  const options = useMemo(
    () => ({
      clientSecret: props.clientSecret,
      locale: props.locale === "en" ? ("en" as const) : ("it" as const),
      appearance: {
        theme: "stripe" as const,
        variables: {
          colorPrimary: "#d97706",
          borderRadius: "8px",
          fontFamily:
            '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        },
      },
    }),
    [props.clientSecret, props.locale],
  );

  if (!stripePublishableKey) {
    return <PaymentSetupError />;
  }

  return (
    <Elements stripe={getStripe()} options={options}>
      <InnerForm {...props} />
    </Elements>
  );
}

// R15-UX-1: Stripe error types che rendono il PaymentIntent inutilizzabile
// per retry. Dopo questi, bisogna ricreare un nuovo PaymentIntent — lo
// stesso clientSecret NON puo' essere ri-confirmato.
const TERMINAL_STRIPE_ERROR_CODES = new Set([
  "payment_intent_authentication_failure",
  "payment_intent_payment_attempt_failed",
  "card_declined",
  "expired_card",
  "incorrect_cvc",
  "processing_error",
  "incorrect_number",
]);

function InnerForm({
  locale,
  appUrl,
  customer,
  amountCents,
  totalCents,
  balanceCents,
  confirmationCode,
  onSuccess,
  onRetryNeeded,
}: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [terminalError, setTerminalError] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [elementReady, setElementReady] = useState(false);
  const [elementComplete, setElementComplete] = useState(false);

  const paymentElementOptions = useMemo(
    () => ({
      layout: "tabs" as const,
      defaultValues: {
        billingDetails: {
          name: `${customer.firstName} ${customer.lastName}`.trim(),
          email: customer.email,
          phone: customer.phone,
        },
      },
    }),
    [customer.email, customer.firstName, customer.lastName, customer.phone],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements || !elementReady) return;
    setError(null);
    setProcessing(true);

    const { error: stripeError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        // R26-A1-A4: canonical APP_URL (server-side) per Stripe return_url.
        // `window.location.origin` era fragile (staging via IP, proxy misconfig).
        return_url: `${appUrl}/${locale}/prenota/success/${confirmationCode}`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Errore pagamento");
      // R15-UX-1: se l'errore e' terminale, il clientSecret non e' piu' usabile.
      // Esponiamo "Usa un altro metodo" che resetta il wizard per ricreare PI.
      const code = stripeError.code ?? "";
      if (TERMINAL_STRIPE_ERROR_CODES.has(code)) {
        setTerminalError(true);
      }
      setProcessing(false);
    } else {
      if (
        !paymentIntent ||
        paymentIntent.status === "succeeded" ||
        paymentIntent.status === "processing" ||
        paymentIntent.status === "requires_capture"
      ) {
        onSuccess();
      } else {
        setError("Il pagamento non e' stato completato. Controlla i dati e riprova.");
        setProcessing(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
          Pagamento sicuro
        </p>
        <h2 className="mt-1 text-2xl font-bold">Completa il checkout</h2>
        <p className="mt-1 text-sm text-slate-600">
          Inserisci i dati della carta o scegli un metodo supportato da Stripe.
        </p>
      </div>
      <PaymentSummary
        amountCents={amountCents}
        totalCents={totalCents}
        balanceCents={balanceCents}
      />
      <div className="rounded-lg border border-slate-200 bg-white p-3">
        {!elementReady && (
          <div
            role="status"
            aria-live="polite"
            className="mb-3 rounded-md bg-slate-50 px-3 py-2 text-sm text-slate-600"
          >
            Caricamento form di pagamento...
          </div>
        )}
        <PaymentElement
          options={paymentElementOptions}
          onReady={() => setElementReady(true)}
          onChange={(event) => {
            setElementComplete(event.complete);
            if (!terminalError) setError(null);
          }}
        />
      </div>
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}
      <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <LockKeyhole className="size-4 text-emerald-600" aria-hidden="true" />
          Dati carta gestiti da Stripe
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <ShieldCheck className="size-4 text-emerald-600" aria-hidden="true" />
          Conferma via email dopo il pagamento
        </div>
      </div>
      {terminalError && onRetryNeeded ? (
        <button
          type="button"
          onClick={onRetryNeeded}
          className="w-full py-3 rounded-full bg-gray-900 text-white font-bold"
        >
          Usa un altro metodo di pagamento
        </button>
      ) : (
        <button
          type="submit"
          disabled={!stripe || !elements || !elementReady || !elementComplete || processing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d97706] py-3 font-bold text-white disabled:opacity-50"
        >
          <CreditCard className="size-4" aria-hidden="true" />
          {processing ? "In elaborazione..." : `Paga ${formatEurCents(amountCents)}`}
        </button>
      )}
    </form>
  );
}

function PaymentSetupError() {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <h2 className="text-lg font-bold">Pagamento non configurato</h2>
      <p className="mt-1">
        Manca la chiave pubblica Stripe. Imposta{" "}
        <code className="rounded bg-amber-100 px-1 py-0.5">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{" "}
        e riavvia il dev server.
      </p>
    </div>
  );
}

function formatEurCents(cents: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function PaymentSummary({
  amountCents,
  totalCents,
  balanceCents,
}: {
  amountCents: number;
  totalCents: number;
  balanceCents: number;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between gap-4">
        <span>Totale prenotazione</span>
        <strong className="text-slate-950">{formatEurCents(totalCents)}</strong>
      </div>
      <div className="mt-2 flex items-center justify-between gap-4">
        <span>Da pagare ora</span>
        <strong className="text-slate-950">{formatEurCents(amountCents)}</strong>
      </div>
      {balanceCents > 0 && (
        <div className="mt-2 flex items-center justify-between gap-4 text-amber-700">
          <span>Saldo in loco</span>
          <strong>{formatEurCents(balanceCents)}</strong>
        </div>
      )}
      {balanceCents > 0 && (
        <p className="mt-2 text-xs leading-5 text-amber-800">
          Il saldo restante si paga solamente in loco prima della partenza.
          Contanti preferiti.
        </p>
      )}
    </div>
  );
}
