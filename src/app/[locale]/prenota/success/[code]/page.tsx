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
    include: { service: true, customer: true, directBooking: true },
  });
  if (!booking) notFound();

  const balance = booking.directBooking?.balanceAmount;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#071934] to-[#0c3d5e] py-24 px-4">
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl p-10 text-center space-y-5">
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
        {balance && (
          <p className="text-amber-700">
            Saldo da versare: <strong>{formatEur(balance)}</strong>
          </p>
        )}
        <p>
          Email conferma inviata a{" "}
          <strong className="text-black">{booking.customer.email}</strong>.
        </p>
      </div>
    </div>
  );
}
