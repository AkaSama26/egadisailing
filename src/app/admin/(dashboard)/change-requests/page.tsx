import Link from "next/link";
import { CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { StatusBadge } from "@/components/admin/status-badge";
import { db } from "@/lib/db";
import { formatItDay } from "@/lib/dates";
import { computeCustomerCancellationPolicy } from "@/lib/booking/cancellation-policy";
import { checkRescheduleAvailability } from "@/lib/booking/reschedule";
import { approveChangeRequest, rejectChangeRequest } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  PENDING: "In attesa",
  APPROVED: "Approvata",
  REJECTED: "Rifiutata",
  CANCELLED: "Annullata",
};

export default async function ChangeRequestsPage() {
  const requests = await db.bookingChangeRequest.findMany({
    include: {
      booking: {
        include: {
          customer: { select: { firstName: true, lastName: true, email: true } },
          service: true,
        },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
  });

  const customerIds = [...new Set(requests.map((r) => r.booking.customerId))];
  const bookingIds = requests.map((r) => r.bookingId);
  const [customerRequestRows, bookingRequestCounts] = await Promise.all([
    customerIds.length > 0
      ? db.bookingChangeRequest.findMany({
          where: { booking: { customerId: { in: customerIds } } },
          select: { booking: { select: { customerId: true } } },
        })
      : [],
    bookingIds.length > 0
      ? db.bookingChangeRequest.groupBy({
          by: ["bookingId"],
          where: { bookingId: { in: bookingIds } },
          _count: { _all: true },
        })
      : [],
  ]);
  const customerRequestCountById = new Map<string, number>();
  for (const row of customerRequestRows) {
    const customerId = row.booking.customerId;
    customerRequestCountById.set(customerId, (customerRequestCountById.get(customerId) ?? 0) + 1);
  }
  const bookingRequestCountById = new Map(
    bookingRequestCounts.map((row) => [row.bookingId, row._count._all]),
  );

  const rows = await Promise.all(
    requests.map(async (r) => {
      const availability =
        r.status === "PENDING"
          ? await checkRescheduleAvailability({
              bookingId: r.booking.id,
              boatId: r.booking.boatId,
              service: r.booking.service,
              numPeople: r.booking.numPeople,
              startDate: r.requestedStartDate,
              endDate: r.requestedEndDate,
            })
          : null;
      const policy = computeCustomerCancellationPolicy(r.originalStartDate);
      const customerRequestCount = customerRequestCountById.get(r.booking.customerId) ?? 0;
      const bookingRequestCount = bookingRequestCountById.get(r.bookingId) ?? 0;
      return { request: r, availability, policy, customerRequestCount, bookingRequestCount };
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader title="Richieste cambio data" />
      <p className="max-w-3xl text-sm text-slate-600">
        Le richieste arrivano dall&apos;area cliente. L&apos;admin approva solo dopo verifica
        disponibilita&apos;; se la richiesta e&apos; sotto i 15 giorni, la policy rimborso resta
        ancorata alla data originale.
      </p>

      <div className="space-y-4">
        {rows.length === 0 && (
          <div className="rounded border border-slate-200 bg-white p-8 text-center text-slate-500">
            Nessuna richiesta cambio data.
          </div>
        )}
        {rows.map(({ request, availability, policy, customerRequestCount, bookingRequestCount }) => {
          const booking = request.booking;
          const customerName = `${booking.customer.firstName} ${booking.customer.lastName}`.trim();
          const isPending = request.status === "PENDING";
          const risky = policy.daysUntilStart < 15;

          return (
            <section key={request.id} className="rounded border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="h-4 w-4 text-slate-500" aria-hidden="true" />
                    <h2 className="font-semibold text-slate-950">
                      {booking.confirmationCode} · {booking.service.name}
                    </h2>
                  </div>
                  <p className="text-sm text-slate-600">
                    {customerName} · {booking.customer.email}
                  </p>
                  <p className="text-sm text-slate-700">
                    Da <strong>{formatItDay(request.originalStartDate)}</strong> a{" "}
                    <strong>{formatItDay(request.requestedStartDate)}</strong>
                  </p>
                  <p className="text-xs text-slate-500">
                    Richiesta il {formatItDay(request.createdAt)} ·{" "}
                    <Link className="underline" href={`/admin/prenotazioni/${booking.id}`}>
                      apri prenotazione
                    </Link>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                    {STATUS_LABEL[request.status] ?? request.status}
                  </span>
                  <StatusBadge status={booking.status} kind="booking" />
                </div>
              </div>

              <div className="mt-4 grid gap-3 text-sm md:grid-cols-4">
                <InfoBox
                  label="Policy data originale"
                  value={policy.label}
                  tone={risky ? "warn" : "default"}
                  detail={`${policy.daysUntilStart} giorni alla partenza originale`}
                />
                <InfoBox
                  label="Disponibilita' nuova data"
                  value={
                    availability
                      ? availability.available
                        ? "Disponibile ora"
                        : "Non disponibile ora"
                      : "Non ricontrollata"
                  }
                  tone={availability && !availability.available ? "warn" : "default"}
                  detail={availability && !availability.available ? availability.reason : undefined}
                />
                <InfoBox
                  label="Nota cliente"
                  value={request.customerNote || "Nessuna nota"}
                />
                <InfoBox
                  label="Storico richieste"
                  value={`${customerRequestCount} cliente · ${bookingRequestCount} prenotazione`}
                  tone={customerRequestCount >= 3 ? "warn" : "default"}
                  detail={
                    customerRequestCount >= 3
                      ? "Cliente con richieste cambio data ripetute"
                      : undefined
                  }
                />
              </div>

              {risky && (
                <p className="mt-4 rounded bg-amber-50 p-3 text-sm font-semibold text-amber-900">
                  Attenzione: richiesta sotto i 15 giorni. Se approvata, la policy rimborso resta
                  ancorata alla data originale.
                </p>
              )}

              {request.adminNote && (
                <p className="mt-4 rounded bg-slate-50 p-3 text-sm text-slate-700">
                  Nota admin: {request.adminNote}
                </p>
              )}

              {isPending && (
                <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 md:grid-cols-[auto_1fr]">
                  <form action={approveChangeRequest}>
                    <input type="hidden" name="requestId" value={request.id} />
                    <button
                      type="submit"
                      disabled={availability?.available === false}
                      className="rounded bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      Approva cambio
                    </button>
                  </form>
                  <form action={rejectChangeRequest} className="flex gap-2">
                    <input type="hidden" name="requestId" value={request.id} />
                    <input
                      name="adminNote"
                      maxLength={1000}
                      placeholder="Motivo rifiuto o data alternativa"
                      className="min-w-0 flex-1 rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="rounded bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100"
                    >
                      Rifiuta
                    </button>
                  </form>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function InfoBox({
  label,
  value,
  detail,
  tone = "default",
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: "default" | "warn";
}) {
  return (
    <div className={`rounded border p-3 ${tone === "warn" ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-slate-50"}`}>
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-1 font-semibold text-slate-950">{value}</p>
      {detail && <p className="mt-1 text-xs text-slate-600">{detail}</p>}
    </div>
  );
}
