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
      locale:
        props.locale === "es"
          ? ("es" as const)
          : props.locale === "fr"
            ? ("fr" as const)
            : props.locale === "de"
              ? ("de" as const)
            : props.locale === "en"
              ? ("en" as const)
              : ("it" as const),
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
    return <PaymentSetupError locale={props.locale} />;
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
  const copy = getStripePaymentCopy(locale);
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
        return_url: `${appUrl}${successReturnPath(locale, confirmationCode)}`,
      },
      redirect: "if_required",
    });

    if (stripeError) {
      setError(stripeError.message ?? copy.paymentError);
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
        setError(copy.paymentIncomplete);
        setProcessing(false);
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
          {copy.eyebrow}
        </p>
        <h2 className="mt-1 text-2xl font-bold">{copy.title}</h2>
        <p className="mt-1 text-sm text-slate-600">
          {copy.subtitle}
        </p>
      </div>
      <PaymentSummary
        locale={locale}
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
            {copy.loadingForm}
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
          {copy.stripeCardData}
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2">
          <ShieldCheck className="size-4 text-emerald-600" aria-hidden="true" />
          {copy.emailConfirmation}
        </div>
      </div>
      {terminalError && onRetryNeeded ? (
        <button
          type="button"
          onClick={onRetryNeeded}
          className="w-full py-3 rounded-full bg-gray-900 text-white font-bold"
        >
          {copy.useAnotherMethod}
        </button>
      ) : (
        <button
          type="submit"
          disabled={!stripe || !elements || !elementReady || !elementComplete || processing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[#d97706] py-3 font-bold text-white disabled:opacity-50"
        >
          <CreditCard className="size-4" aria-hidden="true" />
          {processing ? copy.processing : `${copy.pay} ${formatEurCentsWithVat(amountCents, locale)}`}
        </button>
      )}
    </form>
  );
}

function PaymentSetupError({ locale }: { locale: string }) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <h2 className="text-lg font-bold">
        {isEs
          ? "Pago no configurado"
          : isFr
            ? "Paiement non configuré"
            : isDe
              ? "Zahlung nicht konfiguriert"
              : isEn
                ? "Payment not configured"
                : "Pagamento non configurato"}
      </h2>
      <p className="mt-1">
        {isEs
          ? "Falta la clave pública de Stripe. Configura "
          : isFr
            ? "La clé publique Stripe manque. Configurez "
            : isDe
              ? "Der öffentliche Stripe-Schlüssel fehlt. Setzen Sie "
            : isEn
              ? "Stripe public key is missing. Set "
              : "Manca la chiave pubblica Stripe. Imposta "}
        <code className="rounded bg-amber-100 px-1 py-0.5">NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code>{" "}
        {isEs
          ? "y reinicia el dev server."
          : isFr
            ? "et redémarrez le serveur de développement."
            : isDe
              ? "und starten Sie den Dev-Server neu."
            : isEn
              ? "and restart the dev server."
              : "e riavvia il dev server."}
      </p>
    </div>
  );
}

function formatEurCents(cents: number, locale: string) {
  return new Intl.NumberFormat(locale === "es" ? "es-ES" : locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "it-IT", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

function vatIncludedLabel(locale: string): string {
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

function formatEurCentsWithVat(cents: number, locale: string) {
  return `${formatEurCents(cents, locale)} · ${vatIncludedLabel(locale)}`;
}

function PaymentSummary({
  locale,
  amountCents,
  totalCents,
  balanceCents,
}: {
  locale: string;
  amountCents: number;
  totalCents: number;
  balanceCents: number;
}) {
  const copy = getStripePaymentCopy(locale);
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
      <div className="flex items-center justify-between gap-4">
        <span>{copy.bookingTotal}</span>
        <strong className="text-slate-950">{formatEurCentsWithVat(totalCents, locale)}</strong>
      </div>
      <div className="mt-2 flex items-center justify-between gap-4">
        <span>{copy.payNow}</span>
        <strong className="text-slate-950">{formatEurCentsWithVat(amountCents, locale)}</strong>
      </div>
      {balanceCents > 0 && (
        <div className="mt-2 flex items-center justify-between gap-4 text-amber-700">
          <span>{copy.balanceOnSite}</span>
          <strong>{formatEurCentsWithVat(balanceCents, locale)}</strong>
        </div>
      )}
      {balanceCents > 0 && (
        <p className="mt-2 text-xs leading-5 text-amber-800">
          {copy.balanceNote}
        </p>
      )}
    </div>
  );
}

function getStripePaymentCopy(locale: string) {
  if (locale === "fr") {
    return {
      paymentError: "Erreur de paiement",
      paymentIncomplete: "Le paiement n'a pas été finalisé. Vérifiez les informations et réessayez.",
      eyebrow: "Paiement sécurisé",
      title: "Finalisez le checkout",
      subtitle: "Saisissez les données de votre carte ou choisissez un moyen de paiement accepté par Stripe.",
      loadingForm: "Chargement du formulaire de paiement...",
      stripeCardData: "Données de carte gérées par Stripe",
      emailConfirmation: "Confirmation par email après le paiement",
      useAnotherMethod: "Utiliser un autre moyen de paiement",
      processing: "Traitement en cours...",
      pay: "Payer",
      bookingTotal: "Total de la réservation",
      payNow: "À payer maintenant",
      balanceOnSite: "Solde sur place",
      balanceNote: "Le solde restant est réglé sur place avant le départ.",
    };
  }

  if (locale === "es") {
    return {
      paymentError: "Error de pago",
      paymentIncomplete: "El pago no se ha completado. Comprueba los datos e inténtalo de nuevo.",
      eyebrow: "Pago seguro",
      title: "Completa el checkout",
      subtitle: "Introduce los datos de tu tarjeta o elige un método de pago admitido por Stripe.",
      loadingForm: "Cargando formulario de pago...",
      stripeCardData: "Datos de tarjeta gestionados por Stripe",
      emailConfirmation: "Confirmación por email después del pago",
      useAnotherMethod: "Usar otro método de pago",
      processing: "Procesando...",
      pay: "Pagar",
      bookingTotal: "Total de la reserva",
      payNow: "Pagar ahora",
      balanceOnSite: "Saldo en destino",
      balanceNote: "El saldo restante se paga en destino antes de la salida.",
    };
  }

  if (locale === "de") {
    return {
      paymentError: "Zahlungsfehler",
      paymentIncomplete: "Die Zahlung wurde nicht abgeschlossen. Prüfen Sie die Daten und versuchen Sie es erneut.",
      eyebrow: "Sichere Zahlung",
      title: "Checkout abschließen",
      subtitle: "Geben Sie Ihre Kartendaten ein oder wählen Sie eine von Stripe unterstützte Zahlungsmethode.",
      loadingForm: "Zahlungsformular wird geladen...",
      stripeCardData: "Kartendaten werden von Stripe verwaltet",
      emailConfirmation: "E-Mail-Bestätigung nach der Zahlung",
      useAnotherMethod: "Andere Zahlungsmethode verwenden",
      processing: "Wird verarbeitet...",
      pay: "Bezahlen",
      bookingTotal: "Buchungssumme",
      payNow: "Jetzt bezahlen",
      balanceOnSite: "Restbetrag vor Ort",
      balanceNote: "Der Restbetrag wird vor der Abfahrt vor Ort bezahlt.",
    };
  }

  if (locale === "en") {
    return {
      paymentError: "Payment error",
      paymentIncomplete: "The payment was not completed. Check the details and try again.",
      eyebrow: "Secure payment",
      title: "Complete checkout",
      subtitle: "Enter your card details or choose a payment method supported by Stripe.",
      loadingForm: "Loading payment form...",
      stripeCardData: "Card details managed by Stripe",
      emailConfirmation: "Email confirmation after payment",
      useAnotherMethod: "Use another payment method",
      processing: "Processing...",
      pay: "Pay",
      bookingTotal: "Booking total",
      payNow: "Pay now",
      balanceOnSite: "Balance on site",
      balanceNote: "The remaining balance is paid on site before departure.",
    };
  }

  return {
    paymentError: "Errore pagamento",
    paymentIncomplete: "Il pagamento non è stato completato. Controlla i dati e riprova.",
    eyebrow: "Pagamento sicuro",
    title: "Completa il checkout",
    subtitle: "Inserisci i dati della carta o scegli un metodo supportato da Stripe.",
    loadingForm: "Caricamento form di pagamento...",
    stripeCardData: "Dati carta gestiti da Stripe",
    emailConfirmation: "Conferma via email dopo il pagamento",
    useAnotherMethod: "Usa un altro metodo di pagamento",
    processing: "In elaborazione...",
    pay: "Paga",
    bookingTotal: "Totale prenotazione",
    payNow: "Da pagare ora",
    balanceOnSite: "Saldo in loco",
    balanceNote: "Il saldo restante si paga in loco prima della partenza.",
  };
}

function successReturnPath(locale: string, confirmationCode: string): string {
  const code = encodeURIComponent(confirmationCode);
  if (locale === "es") return `/es/reservar/confirmacion/${code}`;
  if (locale === "fr") return `/fr/reserver/confirmation/${code}`;
  return `/${locale}/prenota/success/${code}`;
}
