import Link from "next/link";
import { db } from "@/lib/db";
import { addDays } from "@/lib/dates";
import { formatItDay } from "@/lib/dates";

export default async function MeteoPage() {
  const now = new Date();
  const weekEnd = addDays(now, 7);

  const [bookings, forecasts] = await Promise.all([
    db.booking.findMany({
      where: { status: "CONFIRMED", startDate: { gte: now, lte: weekEnd } },
      include: { service: { select: { name: true } }, boat: { select: { name: true } } },
      orderBy: { startDate: "asc" },
    }),
    db.weatherForecastCache.findMany({
      where: { date: { gte: now, lte: weekEnd } },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Meteo · prossimi 7 giorni</h1>

      <p className="text-sm text-slate-500">
        La previsione e' popolata dal cron meteo (Plan 6). Finche' il worker non e' attivo, questa
        pagina mostra solo l'elenco delle uscite programmate senza forecast associato.
      </p>

      <section className="bg-white rounded-xl border p-5">
        <h2 className="font-bold text-slate-900 mb-3">Uscite CONFIRMED</h2>
        {bookings.length === 0 ? (
          <p className="text-sm text-slate-500">Nessuna uscita nei prossimi 7 giorni.</p>
        ) : (
          <ul className="space-y-2 text-sm divide-y divide-slate-100">
            {bookings.map((b) => {
              const dateKey = b.startDate.toISOString().slice(0, 10);
              const fc = forecasts.find((f) => f.date.toISOString().slice(0, 10) === dateKey);
              const fcData = (fc?.forecast as {
                suitability?: string;
                windKts?: number;
                wavesMeters?: number;
                precipMm?: number;
              } | null) ?? null;

              return (
                <li key={b.id} className="flex justify-between items-center py-2 gap-3">
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/admin/prenotazioni/${b.id}`}
                      className="font-mono text-xs text-blue-600 hover:underline"
                    >
                      {b.confirmationCode}
                    </Link>
                    {" · "}
                    {b.service.name} · {b.boat.name} ·{" "}
                    <span className="text-slate-500">{formatItDay(b.startDate)}</span>
                  </div>
                  <div className="text-xs text-slate-600 shrink-0">
                    {fcData ? (
                      <>
                        {fcData.suitability && (
                          <span className="font-semibold mr-2">{fcData.suitability}</span>
                        )}
                        {fcData.windKts !== undefined && <>wind {fcData.windKts}kt · </>}
                        {fcData.wavesMeters !== undefined && <>onde {fcData.wavesMeters}m · </>}
                        {fcData.precipMm !== undefined && <>precip {fcData.precipMm}mm</>}
                      </>
                    ) : (
                      <span className="text-slate-400">forecast non disponibile</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
