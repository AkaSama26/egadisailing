import type { Metadata } from "next";
import Decimal from "decimal.js";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { normalizeConfirmationCode } from "@/lib/booking/helpers";
import { buildTicketUrl, ticketSlotLabel } from "@/lib/booking/ticket";
import { createQrSvg } from "@/lib/qr-code";
import { formatEurWithVat, formatEurCentsWithVat } from "@/lib/pricing/vat";
import { PrintTicketButton } from "./print-button";
import { QrDownloadButton } from "@/components/qr-download-button";
import { OceanLayout } from "@/components/customer/ocean-layout";
import { localizedPath } from "@/lib/i18n/paths";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "es"
        ? "Billete de reserva"
        : locale === "fr"
          ? "Billet de réservation"
        : locale === "de"
          ? "Buchungsticket"
        : locale === "en"
          ? "Booking ticket"
          : "Biglietto prenotazione",
    robots: { index: false, follow: false },
  };
}

export default async function TicketPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { locale, code } = await params;
  const booking = await db.booking.findUnique({
    where: { confirmationCode: normalizeConfirmationCode(code) },
    include: {
      boat: true,
      customer: true,
      service: true,
      payments: true,
    },
  });
  if (!booking) notFound();

  const copy = getTicketCopy(locale);
  const ticketUrl = buildTicketUrl(booking.confirmationCode, locale);
  const qrSvg = createQrSvg(ticketUrl, { scale: 5, border: 4 });
  const paid = booking.payments
    .filter((p) => p.status === "SUCCEEDED" && p.type !== "REFUND")
    .reduce((acc, p) => acc.plus(p.amount.toString()), new Decimal(0));
  const customerName = `${booking.customer.firstName} ${booking.customer.lastName}`.trim();
  const statusLabel = getTicketStatusLabel(booking.status, locale);
  const isValid = booking.status === "CONFIRMED";
  const paidCents = paid.mul(100).toNumber();
  const totalCents = new Decimal(booking.totalPrice.toString()).mul(100).toNumber();
  const balanceCents = Math.max(0, totalCents - paidCents);
  const guestBreakdown = getTicketGuestBreakdown(booking, locale);
  const bookingRows: Array<[string, string]> = [
    [copy.code, booking.confirmationCode],
    [copy.channel, booking.source],
    [copy.bookingDate, formatPublicDateTime(booking.createdAt, locale)],
    [copy.total, formatEurWithVat(booking.totalPrice, locale)],
    [copy.paid, formatEurWithVat(paid, locale)],
  ];
  if (balanceCents > 0) {
    bookingRows.push([
      copy.balanceOnSite,
      `${formatEurCentsWithVat(balanceCents, locale)} · ${copy.balanceNote}`,
    ]);
  }

  return (
    <OceanLayout padding="sm" className="egadi-water-reflection overflow-hidden print:bg-white print:p-0">
      <div className="relative z-10 mx-auto max-w-3xl space-y-4 pt-20 text-slate-950 print:pt-0">
        <div className="flex items-center justify-between gap-3 print:hidden">
          <Link
            href={localizedPath(locale, "/b/sessione")}
            className="rounded-lg border border-white/20 bg-white/90 px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm transition hover:bg-white"
          >
            {copy.bookingArea}
          </Link>
          <div className="flex flex-wrap justify-end gap-2">
            <QrDownloadButton
              svg={qrSvg}
              fileName={`egadisailing-${booking.confirmationCode}-qr.svg`}
              className="rounded border px-4 py-2"
            >
              {copy.downloadQr}
            </QrDownloadButton>
            <PrintTicketButton label={copy.print} />
          </div>
        </div>

        <section className="overflow-hidden rounded border border-slate-200 bg-white shadow-sm print:rounded-none print:border-0 print:shadow-none">
          <div className="border-b border-slate-200 bg-slate-950 px-6 py-5 text-white print:bg-white print:text-slate-950">
            <p className="text-xs font-semibold uppercase text-amber-300 print:text-slate-500">
              Egadisailing
            </p>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold">{copy.ticket}</h1>
                <p className="text-sm text-white/75 print:text-slate-600">
                  {copy.bookingCode} {booking.confirmationCode}
                </p>
              </div>
              <div
                className={`w-fit rounded px-3 py-1 text-sm font-semibold ${
                  isValid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"
                }`}
              >
                {statusLabel}
              </div>
            </div>
          </div>

          <div className="grid gap-6 p-6 md:grid-cols-[220px_1fr]">
            <div className="space-y-3">
              <div
                className="mx-auto w-fit rounded border border-slate-200 bg-white p-3"
                dangerouslySetInnerHTML={{ __html: qrSvg }}
              />
              <p className="text-center text-xs text-slate-500">
                {copy.presentQr}
              </p>
              {!isValid && (
                <p className="rounded bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  {copy.notConfirmed}
                </p>
              )}
              {booking.checkedInAt && (
                <p className="rounded bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
                  {copy.checkedInAt} {formatPublicDateTime(booking.checkedInAt, locale)}.
                </p>
              )}
            </div>

            <div className="space-y-5">
              <TicketBlock
                title={copy.experience}
                rows={[
                  [copy.experience, booking.service.name],
                  [copy.boat, booking.boat.name],
                  [copy.experienceDate, formatPublicDay(booking.startDate, locale)],
                  [copy.time, ticketSlotLabel(booking.service.durationType, locale)],
                  [copy.guests, guestBreakdown || String(booking.numPeople)],
                  [copy.seatsUsed, String(booking.numPeople)],
                ]}
              />
              <TicketBlock title={copy.booking} rows={bookingRows} />
              <TicketBlock
                title={copy.holder}
                rows={[
                  [copy.name, customerName],
                  ["Email", booking.customer.email],
                  [copy.phone, booking.customer.phone || copy.notProvided],
                ]}
              />
            </div>
          </div>
        </section>
      </div>
    </OceanLayout>
  );
}

function getTicketStatusLabel(status: string, locale?: string | null): string {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const labels: Record<string, string> = isEs
    ? {
        PENDING: "Pendiente",
        CONFIRMED: "Confirmado",
        CANCELLED: "Cancelado",
        REFUNDED: "Reembolsado",
      }
    : isFr
    ? {
        PENDING: "En attente",
        CONFIRMED: "Confirmé",
        CANCELLED: "Annulé",
        REFUNDED: "Remboursé",
      }
    : isDe
    ? {
        PENDING: "Ausstehend",
        CONFIRMED: "Bestätigt",
        CANCELLED: "Storniert",
        REFUNDED: "Erstattet",
      }
    : isEn
    ? {
        PENDING: "Pending",
        CONFIRMED: "Confirmed",
        CANCELLED: "Cancelled",
        REFUNDED: "Refunded",
      }
    : {
        PENDING: "In attesa",
        CONFIRMED: "Confermato",
        CANCELLED: "Cancellato",
        REFUNDED: "Rimborsato",
      };
  return labels[status] ?? status;
}

function getTicketGuestBreakdown(
  booking: {
    numPeople: number;
    adultCount: number;
    childCount: number;
    freeChildSeatCount: number;
    infantCount: number;
  },
  locale?: string | null,
): string {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  return [
    booking.adultCount ? `${booking.adultCount} ${isEs ? "adultos" : isFr ? "adultes" : isDe ? "Erwachsene" : isEn ? "adults" : "adulti"}` : null,
    booking.childCount ? `${booking.childCount} ${isEs ? "niños 5-9" : isFr ? "enfants 5-9" : isDe ? "Kinder 5-9" : isEn ? "children 5-9" : "bambini 5-9"}` : null,
    booking.freeChildSeatCount
      ? `${booking.freeChildSeatCount} ${isEs ? "niños 3-4" : isFr ? "enfants 3-4" : isDe ? "Kinder 3-4" : isEn ? "children 3-4" : "bimbi 3-4"}`
      : null,
    booking.infantCount ? `${booking.infantCount} ${isEs ? "bebés 0-2" : isFr ? "bébés 0-2" : isDe ? "Kleinkinder 0-2" : isEn ? "infants 0-2" : "neonati 0-2"}` : null,
  ]
    .filter(Boolean)
    .join(", ");
}

function formatPublicDay(date: Date, locale?: string | null): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "it-IT", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function formatPublicDateTime(date: Date, locale?: string | null): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "it-IT", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getTicketCopy(locale?: string | null) {
  if (locale === "de") {
    return {
      bookingArea: "Buchungsbereich",
      downloadQr: "QR herunterladen",
      print: "Drucken",
      ticket: "Ticket",
      bookingCode: "Buchungscode",
      presentQr: "Zeigen Sie diesen QR-Code beim Check-in.",
      notConfirmed: "Dieses Ticket ist noch nicht bestätigt.",
      checkedInAt: "Check-in registriert am",
      experience: "Erlebnis",
      boat: "Boot",
      experienceDate: "Datum des Erlebnisses",
      time: "Uhrzeit",
      guests: "Gäste",
      seatsUsed: "Belegte Plätze",
      booking: "Buchung",
      holder: "Buchungsinhaber",
      name: "Name",
      phone: "Telefon",
      notProvided: "Nicht angegeben",
      code: "Code",
      channel: "Kanal",
      bookingDate: "Buchungsdatum",
      total: "Gesamt",
      paid: "Bezahlt",
      balanceOnSite: "Restbetrag vor Ort",
      balanceNote: "vor der Abfahrt vor Ort zu bezahlen",
    };
  }

  if (locale === "fr") {
    return {
      bookingArea: "Espace réservation",
      downloadQr: "Télécharger le QR",
      print: "Imprimer",
      ticket: "Billet",
      bookingCode: "Code de réservation",
      presentQr: "Présentez ce QR code au check-in.",
      notConfirmed: "Ce billet n'est pas encore confirmé.",
      checkedInAt: "Check-in enregistré le",
      experience: "Expérience",
      boat: "Bateau",
      experienceDate: "Date de l'expérience",
      time: "Horaire",
      guests: "Invités",
      seatsUsed: "Places occupées",
      booking: "Réservation",
      holder: "Titulaire",
      name: "Nom",
      phone: "Téléphone",
      notProvided: "Non indiqué",
      code: "Code",
      channel: "Canal",
      bookingDate: "Date de réservation",
      total: "Total",
      paid: "Payé",
      balanceOnSite: "Solde sur place",
      balanceNote: "à payer sur place avant le départ",
    };
  }

  if (locale === "es") {
    return {
      bookingArea: "Área de reserva",
      downloadQr: "Descargar QR",
      print: "Imprimir",
      ticket: "Billete",
      bookingCode: "Código de reserva",
      presentQr: "Muestra este código QR en el check-in.",
      notConfirmed: "Este billete aún no está confirmado.",
      checkedInAt: "Check-in registrado el",
      experience: "Experiencia",
      boat: "Barco",
      experienceDate: "Fecha de la experiencia",
      time: "Hora",
      guests: "Huéspedes",
      seatsUsed: "Plazas ocupadas",
      booking: "Reserva",
      holder: "Titular",
      name: "Nombre",
      phone: "Teléfono",
      notProvided: "No indicado",
      code: "Código",
      channel: "Canal",
      bookingDate: "Fecha de reserva",
      total: "Total",
      paid: "Pagado",
      balanceOnSite: "Saldo en destino",
      balanceNote: "a pagar en destino antes de la salida",
    };
  }

  if (locale === "en") {
    return {
      bookingArea: "Booking area",
      downloadQr: "Download QR",
      print: "Print",
      ticket: "Ticket",
      bookingCode: "Booking code",
      presentQr: "Show this QR code at check-in.",
      notConfirmed: "This ticket is not confirmed yet.",
      checkedInAt: "Check-in registered on",
      experience: "Experience",
      boat: "Boat",
      experienceDate: "Experience date",
      time: "Time",
      guests: "Guests",
      seatsUsed: "Seats used",
      booking: "Booking",
      holder: "Holder",
      name: "Name",
      phone: "Phone",
      notProvided: "Not provided",
      code: "Code",
      channel: "Channel",
      bookingDate: "Booking date",
      total: "Total",
      paid: "Paid",
      balanceOnSite: "Balance on site",
      balanceNote: "to be paid on site before departure",
    };
  }

  return {
    bookingArea: "Area prenotazioni",
    downloadQr: "Scarica QR",
    print: "Stampa",
    ticket: "Biglietto",
    bookingCode: "Codice prenotazione",
    presentQr: "Presenta questo QR al check-in.",
    notConfirmed: "Questo biglietto non risulta confermato.",
    checkedInAt: "Check-in registrato il",
    experience: "Esperienza",
    boat: "Mezzo",
    experienceDate: "Data esperienza",
    time: "Orario",
    guests: "Ospiti",
    seatsUsed: "Posti occupati",
    booking: "Prenotazione",
    holder: "Intestatario",
    name: "Nome",
    phone: "Telefono",
    notProvided: "Non indicato",
    code: "Codice",
    channel: "Canale",
    bookingDate: "Data prenotazione",
    total: "Totale",
    paid: "Pagato",
    balanceOnSite: "Saldo in loco",
    balanceNote: "da pagare in loco prima della partenza",
  };
}

function TicketBlock({ title, rows }: { title: string; rows: Array<[string, string]> }) {
  return (
    <div>
      <h2 className="border-b border-slate-200 pb-2 text-sm font-bold uppercase text-slate-500">
        {title}
      </h2>
      <dl className="mt-3 grid gap-2 text-sm">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[130px_1fr] gap-3">
            <dt className="text-slate-500">{label}</dt>
            <dd className="font-semibold text-slate-950">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
