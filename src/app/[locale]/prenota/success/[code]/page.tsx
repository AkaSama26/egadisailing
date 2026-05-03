import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Decimal from "decimal.js";
import {
  Anchor,
  CalendarDays,
  CheckCircle2,
  Clock,
  CreditCard,
  Mail,
  MapPinned,
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
import { formatItDay } from "@/lib/dates";
import { formatEurWithVat, formatEurCentsWithVat } from "@/lib/pricing/vat";
import { getExperienceContent } from "@/data/catalog/experiences";
import { getServiceDurationLabel } from "@/lib/services/display";
import { OceanLayout } from "@/components/customer/ocean-layout";
import { QrDownloadButton } from "@/components/qr-download-button";

// R26-A1-A5: pagina post-payment con PII (confirmation code + email link).
// noindex defense-in-depth.
export const metadata: Metadata = { robots: { index: false, follow: false } };

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
  const isOverrideRequest = booking.overrideRequest?.status === "PENDING";
  const statusView = getStatusView({
    status: booking.status,
    isOverrideRequest,
  });
  const paidCents = booking.payments
    .filter((p) => p.status === "SUCCEEDED" && p.type !== "REFUND")
    .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0))
    .mul(100)
    .toNumber();
  const totalCents = new Decimal(booking.totalPrice.toString()).mul(100).toNumber();
  const balanceCents = Math.max(0, totalCents - paidCents);
  const dateLabel = sameUtcDay(booking.startDate, booking.endDate)
    ? formatItDay(booking.startDate)
    : `${formatItDay(booking.startDate)} - ${formatItDay(booking.endDate)}`;
  const guestBreakdown = getGuestBreakdown(booking);
  const isTicketActive = booking.status === "CONFIRMED";
  const StatusIcon = statusView.icon;

  return (
    <OceanLayout padding="sm">
      <main className="mx-auto max-w-6xl space-y-4 text-slate-950">
        <section className="overflow-hidden rounded-2xl bg-white shadow-2xl">
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
                  Conferma prenotazione Egadisailing
                </p>
                <h1 className="max-w-3xl text-3xl font-bold leading-tight text-slate-950 sm:text-5xl">
                  {content?.title ?? booking.service.name}
                </h1>
                <p className="max-w-2xl text-base leading-7 text-slate-600">
                  {content?.subtitle ??
                    "La tua esperienza alle Egadi e' registrata. Qui trovi riepilogo, itinerario, pagamenti e QR per il check-in."}
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryTile icon={CalendarDays} label="Data" value={dateLabel} />
                <SummaryTile
                  icon={Clock}
                  label="Orario"
                  value={ticketSlotLabel(booking.service.durationType)}
                />
                <SummaryTile icon={Users} label="Ospiti" value={guestBreakdown} />
                <SummaryTile icon={Ship} label="Barca" value={booking.boat.name} />
              </div>
            </div>

            <div className="relative min-h-[22rem] bg-slate-900">
              {heroMedia?.src ? (
                <Image
                  src={heroMedia.src}
                  alt={heroMedia.alt ?? content?.title ?? booking.service.name}
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
                <p className="text-sm text-white/75">Durata esperienza</p>
                <p className="text-2xl font-bold">{getServiceDurationLabel(booking.service)}</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
          <section className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Biglietto QR
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  Check-in al porto
                </h2>
              </div>
              <QrCode className="size-7 text-sky-700" aria-hidden="true" />
            </div>

            <div className="mt-6 grid gap-5 sm:grid-cols-[220px_1fr] sm:items-center">
              <div>
                <div
                  className="mx-auto w-fit rounded-xl border border-slate-200 bg-white p-3"
                  dangerouslySetInnerHTML={{ __html: qrSvg }}
                />
                {!isTicketActive && (
                  <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                    Il QR diventa valido al check-in solo dopo la conferma.
                  </p>
                )}
              </div>

              <div className="space-y-4">
                <p className="text-sm leading-6 text-slate-600">
                  Presenta questo QR allo staff. Il gestore lo scannerizza dal telefono e registra
                  il check-in sulla prenotazione.
                </p>
                <div className="flex flex-wrap gap-2">
                  <QrDownloadButton
                    svg={qrSvg}
                    fileName={`egadisailing-${booking.confirmationCode}-qr.svg`}
                  />
                  <Link
                    href={`/${locale}/ticket/${booking.confirmationCode}`}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    <Ticket className="size-4" aria-hidden="true" />
                    Apri biglietto
                  </Link>
                </div>
                <dl className="grid gap-2 border-t border-slate-200 pt-4 text-sm">
                  <InfoRow label="Intestatario" value={`${booking.customer.firstName} ${booking.customer.lastName}`.trim()} />
                  <InfoRow label="Email" value={booking.customer.email} />
                  <InfoRow label="Telefono" value={booking.customer.phone ?? "Non indicato"} />
                </dl>
              </div>
            </div>
          </section>

          <section className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Pagamento
                </p>
                <h2 className="mt-1 text-2xl font-bold text-slate-950">
                  Totale e saldo
                </h2>
              </div>
              <CreditCard className="size-7 text-emerald-700" aria-hidden="true" />
            </div>

            <dl className="mt-6 grid gap-4 sm:grid-cols-3">
              <PaymentMetric label="Totale" value={formatEurWithVat(booking.totalPrice, locale)} />
              <PaymentMetric label="Pagato online" value={formatEurCentsWithVat(paidCents, locale)} />
              <PaymentMetric
                label="Saldo in loco"
                value={
                  balanceCents > 0
                    ? formatEurCentsWithVat(balanceCents, locale)
                    : formatEurCentsWithVat(0, locale)
                }
              />
            </dl>

            {balanceCents > 0 ? (
              <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                Il saldo restante si paga prima della partenza. Porta il codice prenotazione e
                chiedi allo staff se preferisci contanti o altro metodo disponibile in loco.
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                Non risulta saldo residuo sulla prenotazione.
              </div>
            )}

            <div className="mt-5 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
              <ActionLink href={`/${locale}/b/sessione`} icon={Anchor} label="Gestisci prenotazione" />
              <ActionLink href={`mailto:${booking.customer.email}`} icon={Mail} label="Email registrata" />
            </div>
          </section>
        </div>

        <section className="rounded-2xl bg-white p-6 shadow-xl sm:p-8">
          <div className="grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
            <div className="space-y-4">
              <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                Cosa hai prenotato
              </p>
              <h2 className="text-2xl font-bold text-slate-950">
                Esperienza e dettagli operativi
              </h2>
              <p className="text-sm leading-6 text-slate-600">
                {content?.detailDescription ??
                  "Rotta, soste e timing vengono gestiti dalla crew in base alle condizioni del mare."}
              </p>
              <dl className="grid gap-2 border-t border-slate-200 pt-4 text-sm">
                <InfoRow label="Esperienza" value={content?.title ?? booking.service.name} />
                <InfoRow label="Servizio" value={booking.service.name} />
                <InfoRow label="Formula" value={booking.service.pricingUnit === "PER_PACKAGE" ? "Pacchetto" : "A persona"} />
                <InfoRow label="Canale" value={booking.source} />
                <InfoRow label="Creato il" value={formatItDay(booking.createdAt)} />
              </dl>
              <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
                <MapPinned className="mb-2 size-5" aria-hidden="true" />
                Punto di incontro: Porto di Trapani. Le indicazioni operative precise arrivano via
                email e possono variare in base a barca, meteo e ormeggio del giorno.
              </div>
            </div>

            <div>
              <h3 className="text-lg font-bold text-slate-950">Itinerario previsto</h3>
              <ol className="mt-4 space-y-4">
                {(content?.itinerary ?? fallbackItinerary()).map((item, index) => (
                  <li key={`${item.time}-${index}`} className="grid grid-cols-[72px_1fr] gap-4">
                    <div className="text-sm font-bold text-sky-700">{item.time}</div>
                    <div className="border-b border-slate-200 pb-4 last:border-0">
                      <div className="font-semibold text-slate-950">
                        {item.title ?? item.location ?? "Tappa"}
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
            title="Incluso"
            items={content?.includes ?? ["Skipper", "Soste bagno", "Rotta meteo-dipendente"]}
          />
          <ListSection
            title="Cosa portare"
            items={content?.bringItems ?? ["Costume", "Asciugamano", "Crema solare"]}
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

function PaymentMetric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-1 text-xl font-bold text-slate-950">{value}</dd>
    </div>
  );
}

function ActionLink({
  href,
  icon: Icon,
  label,
}: {
  href: string;
  icon: typeof Anchor;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 font-semibold text-slate-800 transition hover:bg-slate-50"
    >
      <Icon className="size-4" aria-hidden="true" />
      {label}
    </Link>
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
}: {
  status: string;
  isOverrideRequest: boolean;
}) {
  if (isOverrideRequest) {
    return {
      label: "In attesa di conferma staff",
      badgeClass: "bg-amber-100 text-amber-950",
      icon: Clock,
    };
  }
  if (status === "CONFIRMED") {
    return {
      label: "Prenotazione confermata",
      badgeClass: "bg-emerald-100 text-emerald-950",
      icon: CheckCircle2,
    };
  }
  if (status === "CANCELLED") {
    return {
      label: "Prenotazione cancellata",
      badgeClass: "bg-red-100 text-red-950",
      icon: Clock,
    };
  }
  if (status === "REFUNDED") {
    return {
      label: "Prenotazione rimborsata",
      badgeClass: "bg-slate-100 text-slate-800",
      icon: CreditCard,
    };
  }
  return {
    label: "Pagamento in elaborazione",
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
}): string {
  const parts = [
    booking.adultCount ? `${booking.adultCount} adulti` : null,
    booking.childCount ? `${booking.childCount} bambini 5-9` : null,
    booking.freeChildSeatCount ? `${booking.freeChildSeatCount} bimbi 3-4` : null,
    booking.infantCount ? `${booking.infantCount} neonati 0-2` : null,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : `${booking.numPeople} ospiti`;
}

function sameUtcDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function fallbackItinerary(): Array<{ time: string; title?: string; location?: string; text: string }> {
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
