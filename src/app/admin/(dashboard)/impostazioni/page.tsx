import { auth } from "@/lib/auth";

export default async function ImpostazioniPage() {
  const session = await auth();

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-900">Impostazioni</h1>

      <section className="bg-white rounded-xl border p-5 space-y-2">
        <h2 className="font-bold text-slate-900">Account</h2>
        <Row label="Nome" value={session?.user?.name ?? "-"} />
        <Row label="Email" value={session?.user?.email ?? "-"} />
        <Row label="Ruolo" value={(session?.user?.role as string | undefined) ?? "-"} />
      </section>

      <section className="bg-white rounded-xl border p-5 space-y-3">
        <h2 className="font-bold text-slate-900">Configurazione</h2>
        <p className="text-sm text-slate-600">
          Le configurazioni sensibili sono gestite tramite <code>.env</code> sul VPS:
        </p>
        <ul className="text-sm text-slate-600 list-disc ml-6 space-y-1">
          <li>Credenziali Stripe, Brevo, Bokun, Boataround, IMAP</li>
          <li>Markup Bokun (<code>BOKUN_PRICE_MARKUP</code>)</li>
          <li>Soglie rate-limit (Redis)</li>
          <li>Secret NextAuth + Cron</li>
        </ul>
        <p className="text-xs text-slate-500">
          Per rotazione secret contattare il team tech. La UI admin per editing ENV e' fuori scope
          (Plan 6).
        </p>
      </section>

      <section className="bg-white rounded-xl border p-5 space-y-3">
        <h2 className="font-bold text-slate-900">Link utili</h2>
        <ul className="text-sm space-y-1 list-disc ml-6">
          <li>
            <a className="text-blue-600 hover:underline" href="/api/health?deep=1">
              Health check deep
            </a>{" "}
            (richiede Bearer CRON_SECRET)
          </li>
          <li>
            <a className="text-blue-600 hover:underline" href="/api/admin/customers/export">
              Export CSV clienti
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <p className="text-sm text-slate-700">
      <span className="text-slate-500">{label}:</span> <strong>{value}</strong>
    </p>
  );
}
