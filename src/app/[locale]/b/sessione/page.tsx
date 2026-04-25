import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { getBookingSession } from "@/lib/session/verify";
import { env } from "@/lib/env";
import { formatEur } from "@/lib/pricing/cents";
import { LogoutButton } from "./logout-button";
import { formatItDay } from "@/lib/dates";
import { OceanLayout } from "@/components/customer/ocean-layout";
import { StatusBadge } from "@/components/admin/status-badge";

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
    include: { service: true, directBooking: true, payments: true },
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
            </div>
          );
        })}
      </div>
    </OceanLayout>
  );
}
