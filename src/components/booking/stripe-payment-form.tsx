"use client";

import { useMemo, useState } from "react";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";

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
  clientSecret: string;
  confirmationCode: string;
  amountCents: number;
  onSuccess: () => void;
  /** Chiamato quando il PaymentIntent e' in stato terminale non-retryable
   *  (`card_declined`, `expired_card`). Il wizard deve ricreare un nuovo
   *  PaymentIntent per permettere un secondo tentativo. R15-UX-1. */
  onRetryNeeded?: () => void;
}

export function StripePaymentForm(props: Props) {
  const options = useMemo(
    () => ({
      clientSecret: props.clientSecret,
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
    [props.clientSecret],
  );
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

function InnerForm({ locale, appUrl, amountCents, confirmationCode, onSuccess, onRetryNeeded }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [terminalError, setTerminalError] = useState(false);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setProcessing(true);

    const { error: stripeError } = await stripe.confirmPayment({
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
      onSuccess();
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-bold">Pagamento</h2>
      <p className="text-gray-600">
        Totale da pagare ora: <strong>€{(amountCents / 100).toFixed(2)}</strong>
      </p>
      <PaymentElement />
      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}
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
          disabled={!stripe || processing}
          className="w-full py-3 rounded-full bg-[#d97706] text-white font-bold disabled:opacity-50"
        >
          {processing ? "In elaborazione..." : `Paga €${(amountCents / 100).toFixed(2)}`}
        </button>
      )}
    </form>
  );
}
