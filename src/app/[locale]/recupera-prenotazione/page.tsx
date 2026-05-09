import type { Metadata } from "next";
import { CalendarClock, KeyRound, LifeBuoy, MailCheck, Ticket } from "lucide-react";
import { RecuperaPrenotazioneClient } from "./client";
import { OceanLayout } from "@/components/customer/ocean-layout";
import { getPublicTurnstileSiteKey } from "@/lib/turnstile/public";

// R26-A1-A5: auth-adjacent page, noindex defense-in-depth oltre robots.txt.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "es"
        ? "Buscar reserva"
        : locale === "fr"
          ? "Retrouver votre réservation"
        : locale === "de"
          ? "Buchung finden"
        : locale === "en"
          ? "Find your booking"
          : "Recupera prenotazione",
    robots: { index: false, follow: false },
  };
}

export default async function RecuperaPrenotazionePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const copy = {
    eyebrow: isEs ? "Acceso a reservas" : isFr ? "Accès réservation" : isDe ? "Buchungszugang" : isEn ? "Booking access" : "Area prenotazioni",
    title: isEs ? "Busca tu reserva" : isFr ? "Retrouvez votre réservation" : isDe ? "Finden Sie Ihre Buchung" : isEn ? "Find your booking" : "Recupera la tua prenotazione",
    text: isEs
      ? "Introduce el email usado en el checkout. Te enviaremos un código de 6 cifras válido durante 15 minutos."
      : isFr
      ? "Saisissez l'email utilisé au checkout. Nous vous enverrons un code à 6 chiffres valable 15 minutes."
      : isDe
      ? "Geben Sie die E-Mail-Adresse ein, die Sie beim Checkout verwendet haben. Wir senden Ihnen einen 6-stelligen Code, der 15 Minuten gültig ist."
      : isEn
      ? "Enter the email used at checkout. We will send a 6-digit code valid for 15 minutes."
      : "Inserisci l'email usata in checkout. Ti inviamo un codice a 6 cifre valido per 15 minuti.",
    steps: isEs
      ? [
          "Recibe el código seguro por email",
          "Abre tu área de reserva",
          "Descarga el ticket QR o solicita cambios",
        ]
      : isFr
      ? [
          "Recevez le code sécurisé par email",
          "Ouvrez votre espace réservation",
          "Téléchargez le billet QR ou demandez des changements",
        ]
      : isDe
      ? [
          "Erhalten Sie den sicheren Code per E-Mail",
          "Öffnen Sie Ihren Buchungsbereich",
          "Laden Sie das QR-Ticket herunter oder beantragen Sie Änderungen",
        ]
      : isEn
      ? [
          "Receive the secure code by email",
          "Open your booking area",
          "Download the QR ticket or request changes",
        ]
      : [
          "Ricevi il codice sicuro via email",
          "Apri la tua area prenotazioni",
          "Scarica il biglietto QR o richiedi modifiche",
        ],
    supportTitle: isEs ? "Qué puedes gestionar" : isFr ? "Ce que vous pouvez gérer" : isDe ? "Was Sie verwalten können" : isEn ? "What you can manage" : "Cosa puoi gestire",
    supportText: isEs
      ? "Cambios de fecha, solicitudes de cancelación y detalles de la reserva están disponibles después del acceso para reservas directas."
      : isFr
      ? "Changements de date, demandes d'annulation et détails de la réservation sont disponibles après accès pour les réservations directes."
      : isDe
      ? "Datumsänderungen, Stornierungsanfragen und Buchungsdetails stehen nach dem Login für Direktbuchungen zur Verfügung."
      : isEn
      ? "Date changes, cancellation requests and booking details are available after login for direct bookings."
      : "Cambio data, richiesta cancellazione e dettagli della prenotazione sono disponibili dopo l'accesso per le prenotazioni dirette.",
  };

  return (
    <OceanLayout padding="sm" className="egadi-water-reflection overflow-hidden">
      <main className="relative z-10 mx-auto grid max-w-6xl gap-6 px-3 py-24 text-slate-950 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <section className="rounded-2xl border border-white/15 bg-white/10 p-6 text-white shadow-2xl sm:p-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-sky-100">
            {copy.eyebrow}
          </p>
          <h1 className="mt-3 text-4xl font-heading font-bold leading-tight md:text-5xl">
            {copy.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-white/75">{copy.text}</p>

          <div className="mt-8 grid gap-3">
            {copy.steps.map((step, index) => {
              const Icon = index === 0 ? MailCheck : index === 1 ? KeyRound : Ticket;
              return (
                <div key={step} className="flex items-start gap-3 rounded-xl bg-white/10 p-4">
                  <Icon className="mt-0.5 size-5 shrink-0 text-amber-300" aria-hidden="true" />
                  <p className="text-sm font-semibold text-white">{step}</p>
                </div>
              );
            })}
          </div>

          <div className="mt-6 rounded-xl border border-white/15 bg-slate-950/25 p-4 text-sm leading-6 text-white/75">
            <div className="flex items-center gap-2 font-bold text-white">
              <LifeBuoy className="size-4 text-sky-200" aria-hidden="true" />
              {copy.supportTitle}
            </div>
            <p className="mt-2">{copy.supportText}</p>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-2xl sm:p-8">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="mt-1 text-2xl font-bold text-slate-950">
                {isEs ? "Acceso seguro" : isFr ? "Accès sécurisé" : isDe ? "Sicherer Zugang" : isEn ? "Secure access" : "Accesso sicuro"}
              </h2>
            </div>
            <CalendarClock className="size-7 text-sky-700" aria-hidden="true" />
          </div>
          <RecuperaPrenotazioneClient
            locale={locale}
            turnstileSiteKey={getPublicTurnstileSiteKey()}
          />
        </section>
      </main>
    </OceanLayout>
  );
}
