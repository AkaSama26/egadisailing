import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { getBookingSession } from "@/lib/session/verify";
import { env } from "@/lib/env";
import { formatEur } from "@/lib/pricing/cents";
import { LogoutButton } from "./logout-button";
import { formatItDay, isoDay } from "@/lib/dates";
import { OceanLayout } from "@/components/customer/ocean-layout";
import { StatusBadge } from "@/components/admin/status-badge";
import { computeCustomerCancellationPolicy } from "@/lib/booking/cancellation-policy";
import { cancelCustomerBooking, requestCustomerReschedule } from "./actions";

// R26-A1-A5: PII area — noindex defense-in-depth oltre robots.txt. Bot che
// ignora robots.txt (o config error serve la pagina con slug indexable)
// non deve produrre cache snapshot con email + confirmation codes.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function SessionePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const session = await getBookingSession();
  if (!session) redirect(`/${locale || env.APP_LOCALES_DEFAULT}/recupera-prenotazione`);

  const bookings = await db.booking.findMany({
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
  });

  return (
    <OceanLayout>
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-white text-3xl font-bold">Le tue prenotazioni</h1>
          <LogoutButton />
        </div>
        <p className="text-white/60 text-sm">
          Accesso come <strong className="text-white">{session.email}</strong>
        </p>
        <p className="text-white/75 text-sm">
          Da questa area puoi aprire il biglietto QR, cambiare data gratuitamente e richiedere
          cancellazione o rimborso per le prenotazioni dirette.
        </p>
        <div className="bg-white/10 border border-white/15 rounded-2xl p-4 text-white/80 text-sm">
          <p className="font-semibold text-white mb-1">Cancellazioni e cambi data</p>
          <p>
            Fino a 15 giorni prima: rimborso completo. Da 14 a 7 giorni prima:
            rimborso del 50%. Da 6 giorni alla partenza: cancellazione senza rimborso.
            Il cambio data e' sempre gratuito, se la nuova data e' disponibile.
          </p>
        </div>
        {bookings.length === 0 && (
          <div className="bg-white rounded-2xl p-8 text-center space-y-4">
            <p className="text-gray-600">Nessuna prenotazione trovata per {session.email}.</p>
            <Link
              href={`/${locale || env.APP_LOCALES_DEFAULT}`}
              className="inline-block px-6 py-3 rounded-full bg-[#d97706] text-white font-bold"
            >
              Scopri le esperienze
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
          return (
            <div key={b.id} className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h2 className="text-xl font-bold">{b.service.name}</h2>
                  <p className="text-gray-600 text-sm">Codice {b.confirmationCode}</p>
                </div>
                <StatusBadge status={b.status} kind="booking" />
              </div>
              <p>
                {formatItDay(b.startDate)} · {b.numPeople} persone
              </p>
              <p>
                Totale {formatEur(total)} · Pagato {formatEur(paid)}
              </p>
              {balance.gt(0) && (
                <p className="text-amber-700 font-semibold mt-2">
                  Saldo da pagare: {formatEur(balance)}
                </p>
              )}
              {b.status === "CONFIRMED" && (
                <Link
                  href={`/${locale || env.APP_LOCALES_DEFAULT}/ticket/${b.confirmationCode}`}
                  className="mt-4 inline-block rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Apri biglietto QR
                </Link>
              )}
              {canManage ? (
                <div className="mt-5 grid gap-4 border-t border-gray-100 pt-4 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="font-semibold text-gray-900">Richiedi cambio data</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Lo staff verifica disponibilita&apos; e policy. La prenotazione resta sulla
                      data attuale finche&apos; la richiesta non viene approvata.
                    </p>
                    {pendingChange && (
                      <p className="mt-2 rounded bg-sky-50 p-2 text-sm text-sky-800">
                        Richiesta in attesa per il {formatItDay(pendingChange.requestedStartDate)}.
                      </p>
                    )}
                    {latestChange && latestChange.status !== "PENDING" && (
                      <p className="mt-2 rounded bg-slate-50 p-2 text-sm text-slate-700">
                        Ultima richiesta: {latestChange.status} ·{" "}
                        {formatItDay(latestChange.requestedStartDate)}
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
                          Richiedi
                        </button>
                      </div>
                      <textarea
                        name="note"
                        maxLength={1000}
                        rows={2}
                        placeholder="Note opzionali per lo staff"
                        className="w-full rounded border border-gray-300 px-2 py-1 text-sm"
                      />
                    </form>
                  </div>
                  <div className="rounded-lg border border-gray-200 p-3">
                    <p className="font-semibold text-gray-900">{policy.label}</p>
                    <p className="mt-1 text-sm text-gray-600">
                      Rimborso stimato: {formatEur(refundable)} su {formatEur(paid)} pagati.
                    </p>
                    <form action={cancelCustomerBooking.bind(null, b.id)} className="mt-3">
                      <button
                        type="submit"
                        className="rounded bg-red-50 px-3 py-1 text-sm font-semibold text-red-700 hover:bg-red-100"
                      >
                        Cancella prenotazione
                      </button>
                    </form>
                  </div>
                </div>
              ) : b.source !== "DIRECT" && (b.status === "PENDING" || b.status === "CONFIRMED") ? (
                <p className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                  Questa prenotazione arriva da {b.source}: cancellazioni e cambi data vanno
                  gestiti dal portale di acquisto.
                </p>
              ) : null}
            </div>
          );
        })}
      </div>
    </OceanLayout>
  );
}
