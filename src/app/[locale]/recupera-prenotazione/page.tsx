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
    title: locale === "en" ? "Find your booking" : "Recupera prenotazione",
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
  const copy = {
    eyebrow: isEn ? "Booking access" : "Area prenotazioni",
    title: isEn ? "Find your booking" : "Recupera la tua prenotazione",
    text: isEn
      ? "Enter the email used at checkout. We will send a 6-digit code valid for 15 minutes."
      : "Inserisci l'email usata in checkout. Ti inviamo un codice a 6 cifre valido per 15 minuti.",
    steps: isEn
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
    supportTitle: isEn ? "What you can manage" : "Cosa puoi gestire",
    supportText: isEn
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
                {isEn ? "Secure access" : "Accesso sicuro"}
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
