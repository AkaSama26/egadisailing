import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { formatEur } from "@/lib/pricing/cents";

export default async function BookingSuccessPage({
  params,
}: {
  params: Promise<{ locale: string; code: string }>;
}) {
  const { code } = await params;
  const booking = await db.booking.findUnique({
    where: { confirmationCode: code },
    include: { service: true, customer: true, directBooking: true, payments: true },
  });
  if (!booking) notFound();

  const isConfirmed = booking.status === "CONFIRMED";
  const paidCents = booking.payments
    .filter((p) => p.status === "SUCCEEDED" && p.type !== "REFUND")
    .reduce((sum, p) => sum.plus(p.amount.toString()), new Decimal(0))
    .mul(100)
    .toNumber();
  const totalCents = new Decimal(booking.totalPrice.toString()).mul(100).toNumber();
  const balanceCents = Math.max(0, totalCents - paidCents);

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071934] to-[#0c3d5e] py-24 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-10 text-center space-y-5">
        {isConfirmed ? (
          <>
            <h1 className="text-3xl font-bold text-emerald-600">Prenotazione confermata</h1>
            <p className="text-gray-600">
              Codice: <strong className="text-black">{booking.confirmationCode}</strong>
            </p>
            <p>
              {booking.service.name} · {booking.startDate.toLocaleDateString("it-IT")}
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
      </div>
    </div>
  );
}
