import type { Metadata } from "next";
import Decimal from "decimal.js";
import Link from "next/link";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatEur } from "@/lib/pricing/cents";
import { normalizeConfirmationCode } from "@/lib/booking/helpers";
import { formatItDay } from "@/lib/dates";
import { AdminAlert } from "@/components/admin/admin-alert";
import { OceanLayout } from "@/components/customer/ocean-layout";
import { CustomerCardLight } from "@/components/customer/customer-card-light";

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
      service: true,
      customer: true,
      directBooking: true,
      payments: true,
      overrideRequest: true,
    },
  });
  if (!booking) notFound();

  const isOverrideRequest = booking.overrideRequest?.status === "PENDING";
  const isConfirmed = booking.status === "CONFIRMED";
  const paidCents = booking.payments
    .filter((p) => p.status === "SUCCEEDED" && p.type !== "REFUND")
    .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0))
    .mul(100)
    .toNumber();
  const totalCents = new Decimal(booking.totalPrice.toString()).mul(100).toNumber();
  const balanceCents = Math.max(0, totalCents - paidCents);

  return (
    <OceanLayout>
      <CustomerCardLight>
        {isOverrideRequest ? (
          <>
            <h1 className="text-3xl font-bold text-sky-700">Prenotazione ricevuta</h1>
            <div className="inline-block px-3 py-1 rounded-full text-sm bg-amber-100 text-amber-900">
              In attesa di conferma
            </div>
            <p className="text-gray-600">
              Codice: <strong className="text-black">{booking.confirmationCode}</strong>
            </p>
            <p>
              {booking.service.name} · {formatItDay(booking.startDate)}
            </p>
            <p>
              Totale pagato:{" "}
              <strong className="text-black">{formatEur(booking.totalPrice)}</strong>
            </p>
            <AdminAlert variant="info" className="text-left space-y-2">
              <p>
                Abbiamo ricevuto il tuo pagamento. Lo staff conferma la
                disponibilita&apos; <strong>entro 72 ore</strong>.
              </p>
              <p>
                Se la data non viene confermata, riceverai{" "}
                <strong>rimborso automatico completo</strong> sulla carta di pagamento
                entro 5-10 giorni lavorativi (0 costi per te).
              </p>
              <p>
                Ti abbiamo inviato una email di conferma ricezione con un link per
                controllare lo stato in ogni momento.
              </p>
            </AdminAlert>
          </>
        ) : isConfirmed ? (
          <>
            <h1 className="text-3xl font-bold text-emerald-600">Prenotazione confermata</h1>
            <p className="text-gray-600">
              Codice: <strong className="text-black">{booking.confirmationCode}</strong>
            </p>
            <p>
              {booking.service.name} · {formatItDay(booking.startDate)}
            </p>
            <p>
              Totale: <strong className="text-black">{formatEur(booking.totalPrice)}</strong>
            </p>
            {balanceCents > 0 && (
              <p className="text-amber-700">
                Saldo da versare:{" "}
                <strong>{formatEur(new Decimal(balanceCents).div(100))}</strong>
              </p>
            )}
            <p>
              Email conferma inviata a{" "}
              <strong className="text-black">{booking.customer.email}</strong>.
            </p>
            <Link
              href={`/${locale}/ticket/${booking.confirmationCode}`}
              className="inline-block rounded-full bg-slate-900 px-5 py-2 text-sm font-bold text-white hover:bg-slate-700"
            >
              Apri biglietto QR
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-3xl font-bold text-amber-600">Pagamento in elaborazione</h1>
            <p className="text-gray-600">
              Codice: <strong className="text-black">{booking.confirmationCode}</strong>
            </p>
            <p className="text-gray-700">
              Stiamo elaborando il pagamento. Riceverai un&apos;email di conferma appena
              completato (di solito entro pochi secondi).
            </p>
            <p className="text-sm text-gray-500">
              Se non ricevi l&apos;email entro 10 minuti, contattaci a{" "}
              <a className="underline" href="mailto:info@egadisailing.com">
                info@egadisailing.com
              </a>
              .
            </p>
          </>
        )}
      </CustomerCardLight>
    </OceanLayout>
  );
}
