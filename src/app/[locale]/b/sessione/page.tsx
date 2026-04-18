import Link from "next/link";
import { redirect } from "next/navigation";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { getBookingSession } from "@/lib/session/verify";
import { env } from "@/lib/env";
import { formatEur } from "@/lib/pricing/cents";
import { LogoutButton } from "./logout-button";

const STATUS_LABEL: Record<string, string> = {
  CONFIRMED: "Confermata",
  PENDING: "In attesa",
  CANCELLED: "Annullata",
  REFUNDED: "Rimborsata",
};

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
    <div className="min-h-screen bg-gradient-to-b from-[#071934] to-[#0c3d5e] py-24 px-4">
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
                <span
                  className={[
                    "px-3 py-1 rounded-full text-xs font-semibold",
                    b.status === "CONFIRMED"
                      ? "bg-emerald-100 text-emerald-800"
                      : b.status === "PENDING"
                        ? "bg-amber-100 text-amber-800"
                        : b.status === "CANCELLED"
                          ? "bg-gray-100 text-gray-600"
                          : "bg-red-100 text-red-700",
                  ].join(" ")}
                >
                  {STATUS_LABEL[b.status] ?? b.status}
                </span>
              </div>
              <p>
                {b.startDate.toLocaleDateString("it-IT")} · {b.numPeople} persone
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
    </div>
  );
}
