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
  clientSecret: string;
  confirmationCode: string;
  amountCents: number;
  onSuccess: () => void;
}

export function StripePaymentForm(props: Props) {
  const options = useMemo(
    () => ({ clientSecret: props.clientSecret, appearance: { theme: "stripe" as const } }),
    [props.clientSecret],
  );
  return (
    <Elements stripe={getStripe()} options={options}>
      <InnerForm {...props} />
    </Elements>
  );
}

function InnerForm({ locale, amountCents, confirmationCode, onSuccess }: Props) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!stripe || !elements) return;
    setError(null);
    setProcessing(true);

    const { error: stripeError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/${locale}/prenota/success/${confirmationCode}`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? "Errore pagamento");
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
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">{error}</div>
      )}
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full py-3 rounded-full bg-[#d97706] text-white font-bold disabled:opacity-50"
      >
        {processing ? "In elaborazione..." : `Paga €${(amountCents / 100).toFixed(2)}`}
      </button>
    </form>
  );
}
