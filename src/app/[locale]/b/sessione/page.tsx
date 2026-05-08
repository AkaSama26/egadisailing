import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { getBookingSession } from "@/lib/session/verify";
import { env } from "@/lib/env";
import { formatEurWithVat } from "@/lib/pricing/vat";
import { LogoutButton } from "./logout-button";
import { isoDay, parseDateLikelyLocalDay } from "@/lib/dates";
import { OceanLayout } from "@/components/customer/ocean-layout";
import { StatusBadge } from "@/components/admin/status-badge";
import { computeCustomerCancellationPolicy } from "@/lib/booking/cancellation-policy";
import { cancelCustomerBooking, requestCustomerReschedule } from "./actions";
import { getAllWeather } from "@/lib/weather/service";
import { buildPublicWeatherSummary } from "@/lib/weather/public-format";
import { CustomerWeatherCard } from "@/components/weather/customer-weather-card";
import { localizedPath } from "@/lib/i18n/paths";
import { localizedStaticPath } from "@/lib/i18n/static-paths";

// R26-A1-A5: PII area — noindex defense-in-depth oltre robots.txt. Bot che
// ignora robots.txt (o config error serve la pagina con slug indexable)
// non deve produrre cache snapshot con email + confirmation codes.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "es"
        ? "Tus reservas"
        : locale === "fr"
          ? "Vos réservations"
          : locale === "en"
            ? "Your bookings"
            : "Le tue prenotazioni",
    robots: { index: false, follow: false },
  };
}

export default async function SessionePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getBookingSession();
  if (!session) {
    redirect(localizedStaticPath(locale || env.APP_LOCALES_DEFAULT, "/recupera-prenotazione"));
  }

  const [bookings, weatherResult] = await Promise.all([
    db.booking.findMany({
      where: { customer: { email: session.email } },
      include: {
        service: true,
        directBooking: true,
        payments: true,
        changeRequests: {
          orderBy: { createdAt: "desc" },
          take: 3,
        },
      },
      orderBy: { startDate: "desc" },
    }),
    getAllWeather()
      .then((items) => ({ items, error: null as string | null }))
      .catch((err) => ({ items: [], error: (err as Error).message })),
  ]);
  const today = parseDateLikelyLocalDay(new Date());
  const weatherByDate = new Map(weatherResult.items.map((item) => [item.date, item]));
  const copy = getSessionCopy(locale);

  return (
    <OceanLayout className="egadi-water-reflection overflow-hidden">
      <div className="relative z-10 max-w-3xl mx-auto space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-white text-3xl font-bold">{copy.title}</h1>
          <LogoutButton label={copy.logout} />
        </div>
        <p className="text-white/60 text-sm">
          {copy.signedInAs} <strong className="text-white">{session.email}</strong>
        </p>
        <p className="text-white/75 text-sm">
          {copy.intro}
        </p>
        <div className="bg-white/10 border border-white/15 rounded-2xl p-4 text-white/80 text-sm">
        <p className="font-semibold text-white mb-1">{copy.policyTitle}</p>
          <p>
            {copy.policyBody}
          </p>
        </div>
        {bookings.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center space-y-4">
            <p className="text-gray-600">{copy.noBookings} {session.email}.</p>
            <Link
              href={`/${locale || env.APP_LOCALES_DEFAULT}`}
              className="inline-block px-6 py-3 rounded-full bg-[#d97706] text-white font-bold"
            >
              {copy.discover}
            </Link>
          </div>
        )}
        {bookings.map((b) => {
          const paid = b.payments
            .filter((p) => p.status === "SUCCEEDED" && p.type !== "REFUND")
            .reduce((acc, p) => acc.plus(p.amount.toString()), new Decimal(0));
          const total = new Decimal(b.totalPrice.toString());
          const balance = Decimal.max(0, total.minus(paid));
          const pendingChange = b.changeRequests.find((r) => r.status === "PENDING");
          const latestChange = b.changeRequests[0];
          const policy = computeCustomerCancellationPolicy(
            b.cancellationPolicyAnchorDate ?? b.startDate,
          );
          const refundable = paid.mul(policy.refundMultiplier);
          const canManage =
            b.source === "DIRECT" && (b.status === "PENDING" || b.status === "CONFIRMED");
          const weather =
            b.startDate.getTime() >= today.getTime() &&
            (b.status === "PENDING" || b.status === "CONFIRMED")
              ? weatherByDate.get(isoDay(b.startDate))
              : null;
          const weatherSummary = weather ? buildPublicWeatherSummary(weather, locale) : null;
          return (
            <div key={b.id} className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-xl font-bold">{b.service.name}</h2>
                  <p className="text-gray-600 text-sm">{copy.code} {b.confirmationCode}</p>
                </div>
                <StatusBadge status={b.status} kind="booking" locale={locale} />
              </div>
              <p>
                {formatPublicDay(b.startDate, locale)} · {b.numPeople} {copy.people}
              </p>
              <p>
                {copy.total} {formatEurWithVat(total, locale)} · {copy.paid} {formatEurWithVat(paid, locale)}
              </p>
              {balance.gt(0) && (
                <p className="text-amber-700 font-semibold mt-2">
                  {copy.balanceDue}: {formatEurWithVat(balance, locale)}
                </p>
              )}
              {weatherSummary && (
                <div className="mt-4">
                  <CustomerWeatherCard
                    summary={weatherSummary}
                    locale={locale}
                    title={
                      locale === "es"
                        ? "Previsión para tu salida"
                        : locale === "fr"
                          ? "Prévisions pour votre sortie"
                          : locale === "en"
                            ? "Forecast for your trip"
                            : "Meteo per la tua uscita"
                    }
                    compact
                  />
                </div>
              )}
              {b.status === "CONFIRMED" && (
                <Link
                  href={localizedPath(locale || env.APP_LOCALES_DEFAULT, `/ticket/${b.confirmationCode}`)}
                  className="mt-4 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  {copy.openQr}
                </Link>
              )}
              {canManage ? (
                <div className="mt-5 grid gap-4 border-t border-gray-100 pt-4 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="font-semibold text-gray-900">{copy.rescheduleTitle}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      {copy.rescheduleBody}
                    </p>
                    {pendingChange && (
                      <p className="mt-2 rounded bg-sky-50 p-2 text-sm text-sky-800">
                        {copy.pendingChange} {formatPublicDay(pendingChange.requestedStartDate, locale)}.
                      </p>
                    )}
                    {latestChange && latestChange.status !== "PENDING" && (
                      <p className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-700">
                        {copy.latestChange}: {latestChange.status} ·{" "}
                        {formatPublicDay(latestChange.requestedStartDate, locale)}
                        {latestChange.adminNote ? ` · ${latestChange.adminNote}` : ""}
                      </p>
                    )}
                    <form action={requestCustomerReschedule} className="mt-3 space-y-2">
                      <input type="hidden" name="bookingId" value={b.id} />
                      <div className="flex gap-2">
                        <input
                          type="date"
                          name="newDate"
                          min={isoDay(new Date())}
                          className="min-w-0 flex-1 rounded border border-gray-300 px-2 py-1 text-sm"
                          required
                        />
                        <button
                          type="submit"
                          className="rounded bg-slate-900 px-3 py-1 text-sm font-semibold text-white"
                        >
                          {copy.request}
                        </button>
                      </div>
                      <textarea
                        name="note"
                        maxLength={1000}
                        rows={2}
                        placeholder={copy.optionalNote}
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    </form>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="font-semibold text-gray-900">
                      {formatPolicyLabel(policy.band, locale)}
                    </p>
                    <p className="mt-1 text-sm text-gray-600">
                      {copy.estimatedRefund}: {formatEurWithVat(refundable, locale)} {copy.onPaid}{" "}
                      {formatEurWithVat(paid, locale)}.
                    </p>
                    <form action={cancelCustomerBooking.bind(null, b.id)} className="mt-3">
                      <button
                        type="submit"
                        className="rounded bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        {copy.cancelBooking}
                      </button>
                    </form>
                  </div>
                </div>
              ) : b.source !== "DIRECT" && (b.status === "PENDING" || b.status === "CONFIRMED") ? (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  {copy.externalBookingPrefix} {b.source}: {copy.externalBookingSuffix}
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </OceanLayout>
  );
}

function formatPublicDay(date: Date, locale?: string | null): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : locale === "fr" ? "fr-FR" : locale === "en" ? "en-GB" : "it-IT", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatPolicyLabel(band: string, locale?: string | null): string {
  if (locale === "es") {
    if (band === "FULL_REFUND") return "Reembolso completo";
    if (band === "HALF_REFUND") return "Reembolso del 50%";
    return "Cancelación sin reembolso";
  }
  if (locale === "fr") {
    if (band === "FULL_REFUND") return "Remboursement complet";
    if (band === "HALF_REFUND") return "Remboursement de 50 %";
    return "Annulation sans remboursement";
  }
  if (locale === "en") {
    if (band === "FULL_REFUND") return "Full refund";
    if (band === "HALF_REFUND") return "50% refund";
    return "Cancellation without refund";
  }
  if (band === "FULL_REFUND") return "Rimborso completo";
  if (band === "HALF_REFUND") return "Rimborso 50%";
  return "Cancellazione senza rimborso";
}

function getSessionCopy(locale?: string | null) {
  if (locale === "fr") {
    return {
      title: "Vos réservations",
      logout: "Se déconnecter",
      signedInAs: "Connecté en tant que",
      intro:
        "Depuis cet espace, vous pouvez ouvrir votre billet QR, demander un changement de date et demander une annulation ou un remboursement pour les réservations directes.",
      policyTitle: "Annulations et changements de date",
      policyBody:
        "Jusqu'à 30 jours avant le départ : remboursement complet. De 29 à 15 jours avant le départ : remboursement de 50 %. Moins de 15 jours avant et en cas de non-présentation : annulation sans remboursement. Les changements de date sont soumis à vérification et approbation de l'équipe.",
      noBookings: "Aucune réservation trouvée pour",
      discover: "Voir les expériences",
      code: "Code",
      people: "personnes",
      total: "Total",
      paid: "Payé",
      balanceDue: "Solde à payer",
      openQr: "Ouvrir le billet QR",
      rescheduleTitle: "Demander un changement de date",
      rescheduleBody:
        "L'équipe vérifiera les disponibilités et la politique. La réservation reste à la date actuelle jusqu'à l'approbation de la demande.",
      pendingChange: "Demande en attente pour le",
      latestChange: "Dernière demande",
      request: "Demander",
      optionalNote: "Notes optionnelles pour l'équipe",
      estimatedRefund: "Remboursement estimé",
      onPaid: "sur",
      cancelBooking: "Annuler la réservation",
      externalBookingPrefix: "Cette réservation provient de",
      externalBookingSuffix: "les annulations et changements de date doivent être gérés depuis le portail d'achat.",
    };
  }

  if (locale === "es") {
    return {
      title: "Tus reservas",
      logout: "Salir",
      signedInAs: "Acceso como",
      intro:
        "Desde esta área puedes abrir tu billete QR, solicitar un cambio de fecha y pedir cancelación o reembolso para reservas directas.",
      policyTitle: "Cancelaciones y cambios de fecha",
      policyBody:
        "Hasta 30 días antes de la salida: reembolso completo. De 29 a 15 días antes: reembolso del 50%. Menos de 15 días antes y en caso de no presentarse: cancelación sin reembolso. Los cambios de fecha están sujetos a revisión y aprobación del equipo.",
      noBookings: "No se encontraron reservas para",
      discover: "Ver experiencias",
      code: "Código",
      people: "personas",
      total: "Total",
      paid: "Pagado",
      balanceDue: "Saldo pendiente",
      openQr: "Abrir billete QR",
      rescheduleTitle: "Solicitar cambio de fecha",
      rescheduleBody:
        "El equipo comprobará disponibilidad y política. La reserva permanece en la fecha actual hasta que la solicitud sea aprobada.",
      pendingChange: "Solicitud pendiente para",
      latestChange: "Última solicitud",
      request: "Solicitar",
      optionalNote: "Notas opcionales para el equipo",
      estimatedRefund: "Reembolso estimado",
      onPaid: "de",
      cancelBooking: "Cancelar reserva",
      externalBookingPrefix: "Esta reserva procede de",
      externalBookingSuffix: "las cancelaciones y cambios de fecha deben gestionarse desde el portal de compra.",
    };
  }
  if (locale === "en") {
    return {
      title: "Your bookings",
      logout: "Log out",
      signedInAs: "Signed in as",
      intro:
        "From this area you can open your QR ticket, request a date change and request cancellation or refund for direct bookings.",
      policyTitle: "Cancellations and date changes",
      policyBody:
        "Up to 30 days before departure: full refund. From 29 to 15 days before departure: 50% refund. Under 15 days and in case of no-show: cancellation without refund. Date changes are subject to staff review and approval.",
      noBookings: "No bookings found for",
      discover: "Discover experiences",
      code: "Code",
      people: "people",
      total: "Total",
      paid: "Paid",
      balanceDue: "Balance due",
      openQr: "Open QR ticket",
      rescheduleTitle: "Request a date change",
      rescheduleBody:
        "The staff will check availability and policy. The booking stays on the current date until the request is approved.",
      pendingChange: "Pending request for",
      latestChange: "Latest request",
      request: "Request",
      optionalNote: "Optional notes for the staff",
      estimatedRefund: "Estimated refund",
      onPaid: "out of",
      cancelBooking: "Cancel booking",
      externalBookingPrefix: "This booking comes from",
      externalBookingSuffix: "cancellations and date changes must be managed through the purchase portal.",
    };
  }

  return {
    title: "Le tue prenotazioni",
    logout: "Esci",
    signedInAs: "Accesso come",
    intro:
      "Da questa area puoi aprire il biglietto QR, richiedere cambio data e richiedere cancellazione o rimborso per le prenotazioni dirette.",
    policyTitle: "Cancellazioni e cambi data",
    policyBody:
      "Fino a 30 giorni prima: rimborso completo. Da 29 a 15 giorni prima: rimborso del 50%. Sotto i 15 giorni e in caso di no-show: cancellazione senza rimborso. Il cambio data è soggetto a verifica e approvazione dello staff.",
    noBookings: "Nessuna prenotazione trovata per",
    discover: "Scopri le esperienze",
    code: "Codice",
    people: "persone",
    total: "Totale",
    paid: "Pagato",
    balanceDue: "Saldo da pagare",
    openQr: "Apri biglietto QR",
    rescheduleTitle: "Richiedi cambio data",
    rescheduleBody:
      "Lo staff verifica disponibilità e policy. La prenotazione resta sulla data attuale finché la richiesta non viene approvata.",
    pendingChange: "Richiesta in attesa per il",
    latestChange: "Ultima richiesta",
    request: "Richiedi",
    optionalNote: "Note opzionali per lo staff",
    estimatedRefund: "Rimborso stimato",
    onPaid: "su",
    cancelBooking: "Cancella prenotazione",
    externalBookingPrefix: "Questa prenotazione arriva da",
    externalBookingSuffix: "cancellazioni e cambi data vanno gestiti dal portale di acquisto.",
  };
}
