import { db } from "@/lib/db";
import { manualBlockRange, manualReleaseRange } from "./actions";

export default async function DisponibilitaPage() {
  const boats = await db.boat.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Disponibilità</h1>
      <p className="text-sm text-slate-600">
        Blocca o rilascia manualmente date per manutenzione, ferie, eventi privati. Le azioni
        propagano fan-out a tutti i canali esterni API (Bokun, Boataround) e creano ManualAlert
        per Click&Boat / Nautal. Il feed iCal SamBoat si aggiorna al prossimo poll (cache 15min).
      </p>

      {boats.length === 0 && (
        <p className="text-sm text-slate-500">Nessuna barca configurata.</p>
      )}

      {boats.map((boat) => (
        <section key={boat.id} className="bg-white rounded-xl border p-5 space-y-4">
          <h2 className="font-bold text-slate-900">{boat.name}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <form
              action={async (fd) => {
                "use server";
                await manualBlockRange(
                  boat.id,
                  String(fd.get("startDate")),
                  String(fd.get("endDate")),
                  String(fd.get("reason") ?? ""),
                );
              }}
              className="space-y-2 p-4 border rounded-lg bg-red-50/40 border-red-200"
            >
              <h3 className="font-semibold text-red-800 text-sm">Blocca range</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">
                  Da
                  <input
                    name="startDate"
                    type="date"
                    className="block w-full border rounded px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="text-xs">
                  A
                  <input
                    name="endDate"
                    type="date"
                    className="block w-full border rounded px-3 py-2 text-sm"
                    required
                  />
                </label>
              </div>
              <input
                name="reason"
                placeholder="Motivo (manutenzione, ferie, ...)"
                maxLength={500}
                className="w-full border rounded px-3 py-2 text-sm"
              />
              <button
                type="submit"
                className="w-full bg-red-600 text-white rounded py-2 text-sm font-medium hover:bg-red-700"
              >
                Blocca
              </button>
            </form>

            <form
              action={async (fd) => {
                "use server";
                await manualReleaseRange(
                  boat.id,
                  String(fd.get("startDate")),
                  String(fd.get("endDate")),
                );
              }}
              className="space-y-2 p-4 border rounded-lg bg-emerald-50/40 border-emerald-200"
            >
              <h3 className="font-semibold text-emerald-800 text-sm">Rilascia range</h3>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-xs">
                  Da
                  <input
                    name="startDate"
                    type="date"
                    className="block w-full border rounded px-3 py-2 text-sm"
                    required
                  />
                </label>
                <label className="text-xs">
                  A
                  <input
                    name="endDate"
                    type="date"
                    className="block w-full border rounded px-3 py-2 text-sm"
                    required
                  />
                </label>
              </div>
              <p className="text-xs text-slate-500 h-[34px] flex items-center">
                Rende disponibili le date selezionate (solo se non bloccate da una prenotazione
                attiva).
              </p>
              <button
                type="submit"
                className="w-full bg-emerald-600 text-white rounded py-2 text-sm font-medium hover:bg-emerald-700"
              >
                Rilascia
              </button>
            </form>
          </div>
        </section>
      ))}
    </div>
  );
}
