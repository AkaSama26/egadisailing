import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Decimal from "decimal.js";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  QrCode,
  Ship,
  Ticket,
  Users,
} from "lucide-react";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { normalizeConfirmationCode } from "@/lib/booking/helpers";
import { buildTicketUrl, ticketSlotLabel } from "@/lib/booking/ticket";
import { createQrSvg } from "@/lib/qr-code";
import { formatEurWithVat, formatEurCentsWithVat } from "@/lib/pricing/vat";
import { getExperienceContent } from "@/data/catalog/experiences";
import { getServiceDurationLabel } from "@/lib/services/display";
import { OceanLayout } from "@/components/customer/ocean-layout";
import { QrDownloadButton } from "@/components/qr-download-button";
import { PUBLIC_CONTACT_LOCATION, getContactLocationLabel } from "@/lib/public-contact";
import { localizedPath } from "@/lib/i18n/paths";

// R26-A1-A5: pagina post-payment con PII (confirmation code + email link).
// noindex defense-in-depth.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  return {
    title:
      locale === "es"
        ? "Reserva confirmada"
        : locale === "fr"
          ? "Réservation confirmée"
        : locale === "de"
          ? "Buchung bestätigt"
        : locale === "en"
          ? "Booking confirmed"
          : "Prenotazione confermata",
    robots: { index: false, follow: false },
  };
}

const TICKET_HERO_BY_BOAT = {
  trimarano: {
    src: "/images/boats/neel-47/neel-47-navigazione.webp",
      alt: {
        it: "Trimarano in navigazione alle Egadi",
        en: "Trimaran cruising in the Egadi Islands",
        es: "Trimarán navegando por las Islas Egadi",
        fr: "Trimaran en navigation aux îles Égades",
        de: "Trimaran unterwegs auf den Ägadischen Inseln",
      },
  },
  motoscafo: {
    src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-bacio.webp",
      alt: {
        it: "Cigala & Bertinetti 34 Offshore Open Bacio in navigazione",
        en: "Cigala & Bertinetti 34 Offshore Open Bacio cruising",
        es: "Cigala & Bertinetti 34 Offshore Open Bacio navegando",
        fr: "Cigala & Bertinetti 34 Offshore Open Bacio en navigation",
        de: "Cigala & Bertinetti 34 Offshore Open Bacio in Fahrt",
      },
  },
  boat: {
    src: "/images/boats/cigala-bertinetti-34-offshore-open/cigala-bertinetti-34-offshore-open-bacio.webp",
      alt: {
        it: "Cigala & Bertinetti 34 Offshore Open Bacio in navigazione",
        en: "Cigala & Bertinetti 34 Offshore Open Bacio cruising",
        es: "Cigala & Bertinetti 34 Offshore Open Bacio navegando",
        fr: "Cigala & Bertinetti 34 Offshore Open Bacio en navigation",
        de: "Cigala & Bertinetti 34 Offshore Open Bacio in Fahrt",
      },
  },
} as const;

export default async function BookingSuccessPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { code, locale } = await params;
  const booking = await db.booking.findUnique({
    where: { confirmationCode: normalizeConfirmationCode(code) },
    include: {
      boat: true,
      service: true,
      customer: true,
      directBooking: true,
      payments: true,
      overrideRequest: true,
    },
  });
  if (!booking) notFound();

  const content = getExperienceContent(booking.service.id, locale);
  const ticketUrl = buildTicketUrl(booking.confirmationCode, locale);
  const qrSvg = createQrSvg(ticketUrl, { scale: 6, border: 4 });
  const heroMedia = content?.media.find((item) => item.src);
  const ticketHero = getTicketHero({
    boatId: booking.boat.id,
    boatName: booking.boat.name,
    fallbackSrc: heroMedia?.src,
    fallbackAlt: heroMedia?.alt ?? content?.title ?? booking.service.name,
    locale,
  });
  const isOverrideRequest = booking.overrideRequest?.status === "PENDING";
  const statusView = getStatusView({
    status: booking.status,
    isOverrideRequest,
    locale,
  });
  const paidCents = booking.payments
    .filter((p) => p.status === "SUCCEEDED" && p.type !== "REFUND")
    .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0))
    .mul(100)
    .toNumber();
  const totalCents = new Decimal(booking.totalPrice.toString()).mul(100).toNumber();
  const balanceCents = Math.max(0, totalCents - paidCents);
  const dateLabel = sameUtcDay(booking.startDate, booking.endDate)
    ? formatPublicDay(booking.startDate, locale)
    : `${formatPublicDay(booking.startDate, locale)} - ${formatPublicDay(booking.endDate, locale)}`;
  const guestBreakdown = getGuestBreakdown(booking, locale);
  const isTicketActive = booking.status === "CONFIRMED";
  const StatusIcon = statusView.icon;
  const meetingPointLabel = getContactLocationLabel(locale);
  const copy = getSuccessCopy(locale);

  return (
    <OceanLayout padding="sm" className="egadi-water-reflection overflow-hidden">
      <main className="relative z-10 mx-auto max-w-6xl space-y-4 pt-14 text-slate-950 sm:pt-16">
        <section className="relative overflow-hidden rounded-2xl bg-white shadow-2xl before:absolute before:left-0 before:top-1/2 before:z-20 before:size-14 before:-translate-x-1/2 before:-translate-y-1/2 before:rounded-full before:bg-[#071934] before:content-['']">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="space-y-6 p-6 sm:p-8 lg:p-10">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${statusView.badgeClass}`}
                >
                  <StatusIcon className="size-4" aria-hidden="true" />
                  {statusView.label}
                </span>
                <span className="rounded-full bg-slate-100 px-3 py-1 font-mono text-sm font-semibold text-slate-700">
                  {booking.confirmationCode}
                </span>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-sky-700">
                  {copy.confirmationEyebrow}
                </p>
                <h1 className="max-w-3xl text-3xl font-bold leading-tight text-slate-950 sm:text-5xl">
                  {content?.title ?? booking.service.name}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600">
                  {content?.subtitle ??
                    copy.heroFallback}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryTile icon={CalendarDays} label={copy.date} value={dateLabel} />
                <SummaryTile
                  icon={Clock}
                  label={copy.time}
                  value={ticketSlotLabel(booking.service.durationType, locale)}
                />
                <SummaryTile icon={Users} label={copy.guests} value={guestBreakdown} />
                <SummaryTile icon={Ship} label={copy.boat} value={booking.boat.name} />
              </div>
            </div>

            <div className="relative min-h-[22rem] bg-slate-900">
              {ticketHero ? (
                <Image
                  src={ticketHero.src}
                  alt={ticketHero.alt}
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-cover"
                  priority
                />
              ) : (
                <div className="absolute inset-0 bg-[linear-gradient(135deg,#0f766e,#0284c7_48%,#f59e0b)]" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-950/10 to-transparent" />
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <p className="text-sm text-white/75">{copy.duration}</p>
                <p className="text-2xl font-bold">{getServiceDurationLabel(booking.service, locale)}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {copy.qrEyebrow}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  {copy.qrTitle}
                </h2>
              </div>
              <QrCode className="size-7 text-sky-700" aria-hidden="true" />
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-[220px_1fr] sm:items-center">
              <div>
                <div
                  className="mx-auto w-fit rounded-xl bg-white p-3"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                {!isTicketActive && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                    {copy.qrInactive}
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-sm leading-6 text-slate-600">
                  {copy.qrBody}
                </p>
                <div className="flex flex-wrap gap-2">
                  <QrDownloadButton
                    svg={qrSvg}
                    fileName={`egadisailing-${booking.confirmationCode}-qr.svg`}
                  >
                    {copy.downloadQr}
                  </QrDownloadButton>
                  <Link
                    href={localizedPath(locale, `/ticket/${booking.confirmationCode}`)}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Ticket className="size-4" aria-hidden="true" />
                    {copy.openTicket}
                  </Link>
                </div>
                <dl className="grid gap-2 border-t border-slate-200 pt-4 text-sm">
                  <InfoRow label={copy.holder} value={`${booking.customer.firstName} ${booking.customer.lastName}`.trim()} />
                  <InfoRow label="Email" value={booking.customer.email} />
                  <InfoRow label={copy.phone} value={booking.customer.phone ?? copy.notProvided} />
                </dl>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {copy.payment}
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  {copy.paymentTitle}
                </h2>
              </div>
              <CreditCard className="size-7 text-emerald-700" aria-hidden="true" />
            </div>

            <dl className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
              <PaymentRow
                label={copy.total}
                value={formatEurWithVat(booking.totalPrice, locale)}
              />
              <PaymentRow
                label={copy.paidOnline}
                value={formatEurCentsWithVat(paidCents, locale)}
                tone="paid"
              />
              <PaymentRow
                label={copy.balanceDue}
                value={
                  balanceCents > 0
                    ? formatEurCentsWithVat(balanceCents, locale)
                    : formatEurCentsWithVat(0, locale)
                }
                tone={balanceCents > 0 ? "due" : "paid"}
              />
            </dl>

            {balanceCents > 0 ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                {copy.balanceDueNote}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                {copy.noBalanceNote}
              </div>
            )}
          </section>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-5">
              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  {copy.detailsEyebrow}
                </p>
                <h2 className="text-2xl font-bold text-slate-950">
                  {content?.title ?? booking.service.name}
                </h2>
                <p className="text-sm leading-6 text-slate-600">
                  {content?.detailDescription ??
                    copy.detailsFallback}
                </p>
              </div>

              <div className="overflow-hidden rounded-xl border border-slate-200 bg-slate-50">
                <div className="p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                    {copy.meetingPoint}
                  </h3>
                  <p className="mt-1 font-semibold text-slate-950">{meetingPointLabel}</p>
                </div>
                <div className="h-64 border-t border-slate-200">
                  <iframe
                    src={PUBLIC_CONTACT_LOCATION.mapEmbedUrl}
                    width="100%"
                    height="100%"
                    style={{ border: 0, minHeight: "100%" }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title={copy.mapTitle}
                    className="h-full w-full"
                  />
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-950">{copy.itinerary}</h3>
              <ol className="mt-4 space-y-4">
                {(content?.itinerary ?? fallbackItinerary(locale)).map((item, index) => (
                  <li key={`${item.time}-${index}`} className="grid grid-cols-[72px_1fr] gap-4">
                    <div className="text-sm font-bold text-sky-700">{item.time}</div>
                    <div className="border-b border-slate-200 pb-4 last:border-0">
                      <div className="font-semibold text-slate-950">
                        {item.title ?? item.location ?? copy.stop}
                      </div>
                      {item.location && item.title && (
                        <div className="text-sm text-slate-500">{item.location}</div>
                      )}
                      <p className="mt-1 text-sm leading-6 text-slate-600">{item.text}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-2">
          <ListSection
            title={copy.included}
            items={content?.includes ?? copy.fallbackIncludes}
          />
          <ListSection
            title={copy.whatToBring}
            items={content?.bringItems ?? copy.fallbackBringItems}
          />
        </section>
      </main>
    </OceanLayout>
  );
}

function SummaryTile({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof CalendarDays;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <Icon className="mb-3 size-5 text-sky-700" aria-hidden="true" />
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-sm font-bold text-slate-950">{value}</div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[120px_1fr] gap-3">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-semibold text-slate-950">{value}</dd>
    </div>
  );
}

function PaymentRow({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "paid" | "due";
}) {
  const valueClass =
    tone === "paid" ? "text-emerald-700" : tone === "due" ? "text-amber-800" : "text-slate-950";

  return (
    <div className="grid gap-1 border-b border-slate-200 px-4 py-4 last:border-b-0 sm:grid-cols-[1fr_auto] sm:items-baseline">
      <dt className="text-sm font-semibold text-slate-600">{label}</dt>
      <dd className={`text-xl font-bold ${valueClass}`}>{value}</dd>
    </div>
  );
}

function ListSection({ title, items }: { title: string; items: string[] }) {
  return (
    <section className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <ul className="mt-4 grid gap-3 text-sm text-slate-700">
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function getStatusView({
  status,
  isOverrideRequest,
  locale,
}: {
  status: string;
  isOverrideRequest: boolean;
  locale?: string | null;
}) {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  if (isOverrideRequest) {
    return {
      label: isEs
        ? "Esperando confirmación del equipo"
        : isFr
          ? "En attente de confirmation de l'équipe"
        : isDe
          ? "Warten auf Bestätigung des Teams"
          : isEn
            ? "Waiting for staff confirmation"
            : "In attesa di conferma staff",
      badgeClass: "bg-amber-100 text-amber-950",
      icon: Clock,
    };
  }
  if (status === "CONFIRMED") {
    return {
      label: isEs ? "Reserva confirmada" : isFr ? "Réservation confirmée" : isDe ? "Buchung bestätigt" : isEn ? "Booking confirmed" : "Prenotazione confermata",
      badgeClass: "bg-emerald-100 text-emerald-950",
      icon: CheckCircle2,
    };
  }
  if (status === "CANCELLED") {
    return {
      label: isEs ? "Reserva cancelada" : isFr ? "Réservation annulée" : isDe ? "Buchung storniert" : isEn ? "Booking cancelled" : "Prenotazione cancellata",
      badgeClass: "bg-red-100 text-red-950",
      icon: Clock,
    };
  }
  if (status === "REFUNDED") {
    return {
      label: isEs ? "Reserva reembolsada" : isFr ? "Réservation remboursée" : isDe ? "Buchung erstattet" : isEn ? "Booking refunded" : "Prenotazione rimborsata",
      badgeClass: "bg-slate-100 text-slate-800",
      icon: CreditCard,
    };
  }
  return {
    label: isEs ? "Pago en proceso" : isFr ? "Paiement en cours" : isDe ? "Zahlung in Bearbeitung" : isEn ? "Payment processing" : "Pagamento in elaborazione",
    badgeClass: "bg-amber-100 text-amber-950",
    icon: Clock,
  };
}

function getGuestBreakdown(booking: {
  numPeople: number;
  adultCount: number;
  childCount: number;
  freeChildSeatCount: number;
  infantCount: number;
}, locale?: string | null): string {
  const isEn = locale === "en";
  const isEs = locale === "es";
  const isFr = locale === "fr";
  const isDe = locale === "de";
  const parts = [
    booking.adultCount ? `${booking.adultCount} ${isEs ? "adultos" : isFr ? "adultes" : isDe ? "Erwachsene" : isEn ? "adults" : "adulti"}` : null,
    booking.childCount ? `${booking.childCount} ${isEs ? "niños 5-9" : isFr ? "enfants 5-9" : isDe ? "Kinder 5-9" : isEn ? "children 5-9" : "bambini 5-9"}` : null,
    booking.freeChildSeatCount ? `${booking.freeChildSeatCount} ${isEs ? "niños 3-4" : isFr ? "enfants 3-4" : isDe ? "Kinder 3-4" : isEn ? "children 3-4" : "bimbi 3-4"}` : null,
    booking.infantCount ? `${booking.infantCount} ${isEs ? "bebés 0-2" : isFr ? "bébés 0-2" : isDe ? "Kleinkinder 0-2" : isEn ? "infants 0-2" : "neonati 0-2"}` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : `${booking.numPeople} ${isEs ? "huéspedes" : isFr ? "invités" : isDe ? "Gäste" : isEn ? "guests" : "ospiti"}`;
}

function sameUtcDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function fallbackItinerary(
  locale?: string | null,
): Array<{ time: string; title?: string; location?: string; text: string }> {
  if (locale === "de") {
    return [
      {
        time: "Einschiffung",
        title: "Briefing",
        text: "Empfang, Buchungskontrolle und Sicherheitsbriefing.",
      },
      {
        time: "Route",
        title: "Ägadische Inseln",
        text: "Navigation und Stopps, die die Crew je nach Wind, Meer und Andrang auswählt.",
      },
      {
        time: "Rückkehr",
        title: "Trapani",
        text: "Rückkehr zum Hafen entsprechend dem gebuchten Zeitfenster.",
      },
    ];
  }

  if (locale === "fr") {
    return [
      {
        time: "Embarquement",
        title: "Briefing",
        text: "Accueil, vérification de la réservation et briefing de sécurité.",
      },
      {
        time: "Route",
        title: "Îles Égades",
        text: "Navigation et arrêts choisis par l'équipage selon le vent, la mer et l'affluence.",
      },
      {
        time: "Retour",
        title: "Trapani",
        text: "Retour au port selon le créneau horaire réservé.",
      },
    ];
  }

  if (locale === "es") {
    return [
      {
        time: "Embarque",
        title: "Briefing",
        text: "Bienvenida, comprobación de la reserva y briefing de seguridad.",
      },
      {
        time: "Ruta",
        title: "Islas Egadi",
        text: "Navegación y paradas elegidas por la tripulación según viento, mar y afluencia.",
      },
      {
        time: "Regreso",
        title: "Trapani",
        text: "Regreso al puerto según la franja horaria reservada.",
      },
    ];
  }

  if (locale === "en") {
    return [
      {
        time: "Boarding",
        title: "Briefing",
        text: "Welcome, booking check and safety briefing.",
      },
      {
        time: "Route",
        title: "Egadi Islands",
        text: "Cruising and stops selected by the crew according to wind, sea and crowding.",
      },
      {
        time: "Return",
        title: "Trapani",
        text: "Return to the harbour according to the booked time slot.",
      },
    ];
  }

  return [
    {
      time: "Imbarco",
      title: "Briefing",
      text: "Accoglienza, controllo prenotazione e briefing sicurezza.",
    },
    {
      time: "Rotta",
      title: "Isole Egadi",
      text: "Navigazione e soste selezionate dalla crew in base a vento, mare e affollamento.",
    },
    {
      time: "Rientro",
      title: "Trapani",
      text: "Rientro al porto secondo la fascia oraria prenotata.",
    },
  ];
}

function getTicketHero({
  boatId,
  boatName,
  fallbackSrc,
  fallbackAlt,
  locale,
}: {
  boatId: string;
  boatName: string;
  fallbackSrc?: string;
  fallbackAlt: string;
  locale?: string | null;
}): { src: string; alt: string } | null {
  const key = `${boatId} ${boatName}`.toLowerCase();
  const altLocale = locale === "es" ? "es" : locale === "fr" ? "fr" : locale === "de" ? "de" : locale === "en" ? "en" : "it";
  if (key.includes("trimarano") || key.includes("neel")) {
    const hero = TICKET_HERO_BY_BOAT.trimarano;
    return { src: hero.src, alt: hero.alt[altLocale] };
  }
  if (boatId === "boat" || key.includes("cigala") || key.includes("motoscafo")) {
    const hero = TICKET_HERO_BY_BOAT.boat;
    return { src: hero.src, alt: hero.alt[altLocale] };
  }
  if (fallbackSrc) return { src: fallbackSrc, alt: fallbackAlt };
  return null;
}

function formatPublicDay(date: Date, locale?: string | null): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-ES" : locale === "fr" ? "fr-FR" : locale === "de" ? "de-DE" : locale === "en" ? "en-GB" : "it-IT", {
    timeZone: "Europe/Rome",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function getSuccessCopy(locale?: string | null) {
  if (locale === "de") {
    return {
      confirmationEyebrow: "Egadisailing Buchungsbestätigung",
      heroFallback:
        "Ihr Erlebnis auf den Ägadischen Inseln ist registriert. Hier finden Sie Zusammenfassung, Route, Zahlungen und den QR-Code für den Check-in.",
      date: "Datum",
      time: "Uhrzeit",
      guests: "Gäste",
      boat: "Boot",
      duration: "Dauer des Erlebnisses",
      qrEyebrow: "QR-Ticket",
      qrTitle: "Check-in am Hafen",
      qrInactive: "Der QR-Code ist erst nach der Bestätigung für den Check-in gültig.",
      qrBody:
        "Zeigen Sie diesen QR-Code dem Team. Die verantwortliche Person scannt ihn mit dem Telefon und registriert den Check-in der Buchung.",
      openTicket: "Ticket öffnen",
      downloadQr: "QR herunterladen",
      holder: "Buchungsinhaber",
      phone: "Telefon",
      notProvided: "Nicht angegeben",
      payment: "Zahlung",
      paymentTitle: "Gesamtbetrag und Restbetrag",
      total: "Buchungssumme",
      paidOnline: "Online bezahlt",
      balanceDue: "Restbetrag vor Ort",
      balanceDueNote: "Der Restbetrag wird vor der Abfahrt vor Ort bezahlt.",
      noBalanceNote: "Buchung bezahlt: Es bleibt kein Restbetrag offen.",
      detailsEyebrow: "Details des Erlebnisses",
      detailsFallback: "Route, Stopps und Zeiten werden von der Crew nach Seebedingungen gesteuert.",
      meetingPoint: "Treffpunkt",
      mapTitle: "Karte des Egadisailing-Treffpunkts",
      itinerary: "Vorgesehene Route",
      stop: "Stopp",
      included: "Inklusive",
      whatToBring: "Was Sie mitbringen sollten",
      fallbackIncludes: ["Skipper", "Badestopps", "Wetterabhängige Route"],
      fallbackBringItems: ["Badebekleidung", "Handtuch", "Sonnencreme"],
    };
  }

  if (locale === "fr") {
    return {
      confirmationEyebrow: "Confirmation de réservation Egadisailing",
      heroFallback:
        "Votre expérience aux îles Égades est enregistrée. Vous trouverez ici le résumé, l'itinéraire, les paiements et le QR code pour le check-in.",
      date: "Date",
      time: "Horaire",
      guests: "Invités",
      boat: "Bateau",
      duration: "Durée de l'expérience",
      qrEyebrow: "Billet QR",
      qrTitle: "Check-in au port",
      qrInactive: "Le QR code sera valable pour le check-in uniquement après confirmation.",
      qrBody:
        "Présentez ce QR code à l'équipe. Le responsable le scannera depuis son téléphone et enregistrera le check-in de la réservation.",
      openTicket: "Ouvrir le billet",
      downloadQr: "Télécharger le QR",
      holder: "Titulaire",
      phone: "Téléphone",
      notProvided: "Non indiqué",
      payment: "Paiement",
      paymentTitle: "Total et solde",
      total: "Total de la réservation",
      paidOnline: "Payé en ligne",
      balanceDue: "Solde à régler sur place",
      balanceDueNote: "Le solde restant est réglé sur place avant le départ.",
      noBalanceNote: "Réservation payée : aucun solde restant.",
      detailsEyebrow: "Détails de l'expérience",
      detailsFallback: "Route, arrêts et horaires sont gérés par l'équipage selon l'état de la mer.",
      meetingPoint: "Point de rendez-vous",
      mapTitle: "Carte du point de rendez-vous Egadisailing",
      itinerary: "Itinéraire prévu",
      stop: "Arrêt",
      included: "Inclus",
      whatToBring: "À apporter",
      fallbackIncludes: ["Skipper", "Arrêts baignade", "Route selon la météo"],
      fallbackBringItems: ["Maillot de bain", "Serviette", "Crème solaire"],
    };
  }

  if (locale === "es") {
    return {
      confirmationEyebrow: "Confirmación de reserva Egadisailing",
      heroFallback:
        "Tu experiencia en las Islas Egadi está registrada. Aquí encuentras resumen, itinerario, pagos y código QR para el check-in.",
      date: "Fecha",
      time: "Hora",
      guests: "Huéspedes",
      boat: "Barco",
      duration: "Duración de la experiencia",
      qrEyebrow: "Ticket QR",
      qrTitle: "Check-in en el puerto",
      qrInactive: "El QR será válido para el check-in solo después de la confirmación.",
      qrBody:
        "Muestra este QR al equipo. El responsable lo escaneará desde el teléfono y registrará el check-in de la reserva.",
      openTicket: "Abrir ticket",
      downloadQr: "Descargar QR",
      holder: "Titular",
      phone: "Teléfono",
      notProvided: "No indicado",
      payment: "Pago",
      paymentTitle: "Total y saldo",
      total: "Total de la reserva",
      paidOnline: "Pagado online",
      balanceDue: "Saldo pendiente en destino",
      balanceDueNote: "El saldo restante se paga en destino antes de la salida.",
      noBalanceNote: "Reserva pagada: no queda saldo pendiente.",
      detailsEyebrow: "Detalles de la experiencia",
      detailsFallback: "Ruta, paradas y horarios son gestionados por la tripulación según el estado del mar.",
      meetingPoint: "Punto de encuentro",
      mapTitle: "Mapa del punto de encuentro Egadisailing",
      itinerary: "Itinerario previsto",
      stop: "Parada",
      included: "Incluido",
      whatToBring: "Qué llevar",
      fallbackIncludes: ["Patrón", "Paradas de baño", "Ruta según meteorología"],
      fallbackBringItems: ["Bañador", "Toalla", "Protector solar"],
    };
  }

  if (locale === "en") {
    return {
      confirmationEyebrow: "Egadisailing booking confirmation",
      heroFallback:
        "Your Egadi Islands experience is registered. Here you will find your summary, itinerary, payments and check-in QR code.",
      date: "Date",
      time: "Time",
      guests: "Guests",
      boat: "Boat",
      duration: "Experience duration",
      qrEyebrow: "QR ticket",
      qrTitle: "Harbour check-in",
      qrInactive: "The QR code becomes valid for check-in only after confirmation.",
      qrBody:
        "Show this QR code to the staff. The manager will scan it from the phone and register check-in for the booking.",
      openTicket: "Open ticket",
      downloadQr: "Download QR",
      holder: "Holder",
      phone: "Phone",
      notProvided: "Not provided",
      payment: "Payment",
      paymentTitle: "Total and balance",
      total: "Booking total",
      paidOnline: "Paid online",
      balanceDue: "Balance due on site",
      balanceDueNote: "The remaining balance is paid on site before departure.",
      noBalanceNote: "Booking paid: there is no remaining balance.",
      detailsEyebrow: "Experience details",
      detailsFallback: "Route, stops and timing are managed by the crew according to sea conditions.",
      meetingPoint: "Meeting point",
      mapTitle: "Egadisailing meeting point map",
      itinerary: "Expected itinerary",
      stop: "Stop",
      included: "Included",
      whatToBring: "What to bring",
      fallbackIncludes: ["Skipper", "Swim stops", "Weather-dependent route"],
      fallbackBringItems: ["Swimsuit", "Towel", "Sunscreen"],
    };
  }

  return {
    confirmationEyebrow: "Conferma prenotazione Egadisailing",
    heroFallback:
      "La tua esperienza alle Egadi è registrata. Qui trovi riepilogo, itinerario, pagamenti e QR per il check-in.",
    date: "Data",
    time: "Orario",
    guests: "Ospiti",
    boat: "Barca",
    duration: "Durata esperienza",
    qrEyebrow: "Biglietto QR",
    qrTitle: "Check-in al porto",
    qrInactive: "Il QR diventa valido al check-in solo dopo la conferma.",
    qrBody:
      "Presenta questo QR allo staff. Il gestore lo scannerizza dal telefono e registra il check-in sulla prenotazione.",
    openTicket: "Apri biglietto",
    downloadQr: "Scarica QR",
    holder: "Intestatario",
    phone: "Telefono",
    notProvided: "Non indicato",
    payment: "Pagamento",
    paymentTitle: "Totale e saldo",
    total: "Totale prenotazione",
    paidOnline: "Saldato online",
    balanceDue: "Da saldare in loco",
    balanceDueNote: "Il saldo restante si paga in loco prima della partenza.",
    noBalanceNote: "Prenotazione saldata: non risulta saldo residuo.",
    detailsEyebrow: "Dettagli esperienza",
    detailsFallback: "Rotta, soste e timing vengono gestiti dalla crew in base alle condizioni del mare.",
    meetingPoint: "Punto d'incontro",
    mapTitle: "Mappa punto d'incontro Egadisailing",
    itinerary: "Itinerario previsto",
    stop: "Tappa",
    included: "Incluso",
    whatToBring: "Cosa portare",
    fallbackIncludes: ["Skipper", "Soste bagno", "Rotta meteo-dipendente"],
    fallbackBringItems: ["Costume", "Asciugamano", "Crema solare"],
  };
}
