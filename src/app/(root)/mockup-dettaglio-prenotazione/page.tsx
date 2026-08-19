import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  Check,
  CheckCircle2,
  CreditCard,
  FileText,
  Info,
  Plus,
  ReceiptText,
  UserRound,
  WalletCards,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminSidebar } from "@/app/admin/_components/admin-sidebar";
import { AdminTopbar } from "@/app/admin/_components/admin-topbar";

export const metadata: Metadata = {
  title: "Mockup pagamenti prenotazione | Egadisailing",
  robots: { index: false, follow: false },
};

type Variant = "a" | "b" | "c";

interface PageProps {
  searchParams: Promise<{ variant?: string }>;
}

const TOTAL = 2_500;
const COLLECTED = 1_250;
const OUTSTANDING = TOTAL - COLLECTED;

const variants: Array<{ id: Variant; label: string }> = [
  { id: "a", label: "Movimenti" },
  { id: "b", label: "Conto cliente" },
  { id: "c", label: "Piano pagamenti" },
];

const payments = [
  {
    date: "19 ago 2026",
    time: "10:42",
    label: "Acconto prenotazione",
    method: "Carta · Stripe",
    amount: 750,
    receipt: "R-2026/018",
    balance: 1_750,
  },
  {
    date: "21 ago 2026",
    time: "09:15",
    label: "Pagamento parziale",
    method: "Bonifico bancario",
    amount: 500,
    receipt: "Da emettere",
    balance: 1_250,
  },
];

function euro(value: number) {
  return new Intl.NumberFormat("it-IT", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 0,
  }).format(value);
}

export default async function BookingPaymentMockupPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const variant: Variant = params.variant === "b" || params.variant === "c" ? params.variant : "a";

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopbar userName="Anteprima" />
        <main className="flex-1 overflow-y-auto bg-slate-50/40 p-4 md:p-6">
          <div className="mx-auto max-w-[1520px] space-y-4 pb-6">
            <BookingHeader variant={variant} />
            <BookingIdentity />
            <BillingDetails />
            <PaymentSummary />
            {variant === "a" && <MovementView />}
            {variant === "b" && <CustomerAccountView />}
            {variant === "c" && <PaymentPlanView />}
          </div>
        </main>
      </div>
    </div>
  );
}

function BookingHeader({ variant }: { variant: Variant }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <button
          type="button"
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-950"
        >
          <ArrowLeft className="size-3.5" aria-hidden="true" />
          Prenotazioni
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 md:text-3xl">
            Prenotazione MOCK-G2401
          </h1>
          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
            Confermata
          </span>
          <span className="rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-500">
            Mockup
          </span>
        </div>
      </div>

      <nav
        className="flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm"
        aria-label="Varianti mockup pagamenti"
      >
        {variants.map((item) => (
          <Link
            key={item.id}
            href={`/mockup-dettaglio-prenotazione?variant=${item.id}`}
            className={`rounded-lg px-3 py-2 text-xs font-semibold transition ${
              variant === item.id
                ? "bg-slate-950 text-white"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
            }`}
          >
            {item.id.toUpperCase()} · {item.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function BookingIdentity() {
  return (
    <AdminCard padding="sm">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <IdentityItem icon={UserRound} label="Cliente" value="Francesca Villa" detail="francesca.villa@email.it" />
        <IdentityItem icon={CalendarDays} label="Esperienza" value="24 agosto 2026" detail="Esperienza Gourmet · Trimarano" />
        <IdentityItem icon={WalletCards} label="Formula" value="Barca esclusiva" detail="8 persone" />
        <IdentityItem icon={FileText} label="Stato pagamento" value="Parzialmente pagata" detail="Ultimo incasso 21 ago 2026" tone="warning" />
      </div>
    </AdminCard>
  );
}

function BillingDetails() {
  return (
    <AdminCard padding="sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <FileText className="size-4" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-950">Dati di fatturazione</h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-emerald-700">
                Completi
              </span>
            </div>
            <p className="text-[10px] text-slate-500">Snapshot associato a questa prenotazione</p>
          </div>
        </div>
        <button type="button" className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[10px] font-bold text-slate-700 shadow-sm">
          Modifica dati
        </button>
      </div>

      <div className="mt-3 grid gap-x-6 gap-y-2 border-t border-slate-100 pt-3 sm:grid-cols-2 xl:grid-cols-5">
        <BillingItem label="Intestatario" value="Francesca Villa" />
        <BillingItem label="Codice fiscale / Tax ID" value="VLLFNC88C52F205X" mono />
        <BillingItem label="Indirizzo" value="Via Brera 18" />
        <BillingItem label="Località" value="20121 Milano (MI)" />
        <BillingItem label="Paese · Nazionalità" value="Italia · IT" />
      </div>
    </AdminCard>
  );
}

function BillingItem({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`truncate text-xs font-semibold text-slate-800 ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function IdentityItem({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p>
        <p className={`truncate text-sm font-bold ${tone === "warning" ? "text-amber-700" : "text-slate-950"}`}>{value}</p>
        <p className="truncate text-[11px] text-slate-500">{detail}</p>
      </div>
    </div>
  );
}

function PaymentSummary() {
  const progress = Math.round((COLLECTED / TOTAL) * 100);

  return (
    <div className="grid gap-3 md:grid-cols-3">
      <SummaryCard icon={ReceiptText} label="Totale prenotazione" value={euro(TOTAL)} detail="Importo concordato" />
      <SummaryCard icon={Banknote} label="Incassato" value={euro(COLLECTED)} detail={`${progress}% del totale`} tone="success" />
      <SummaryCard icon={CreditCard} label="Da pagare" value={euro(OUTSTANDING)} detail="Saldo residuo" tone="warning" />
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  label,
  value,
  detail,
  tone = "default",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  detail: string;
  tone?: "default" | "success" | "warning";
}) {
  const styles = {
    default: { bar: "bg-slate-950", icon: "bg-slate-100 text-slate-600", value: "text-slate-950" },
    success: { bar: "bg-emerald-500", icon: "bg-emerald-50 text-emerald-700", value: "text-emerald-700" },
    warning: { bar: "bg-amber-500", icon: "bg-amber-50 text-amber-700", value: "text-amber-700" },
  }[tone];

  return (
    <AdminCard padding="sm" className="relative overflow-hidden">
      <div className={`absolute inset-x-0 top-0 h-0.5 ${styles.bar}`} />
      <div className="flex items-center gap-3">
        <div className={`flex size-9 items-center justify-center rounded-lg ${styles.icon}`}>
          <Icon className="size-4" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
          <p className={`text-2xl font-black tracking-tight tabular-nums ${styles.value}`}>{value}</p>
          <p className="text-[10px] text-slate-500">{detail}</p>
        </div>
      </div>
    </AdminCard>
  );
}

function MovementView() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <AdminCard padding="none" className="overflow-hidden">
        <TableHeader
          title="Movimenti della prenotazione"
          subtitle="Ogni incasso riduce automaticamente il saldo residuo"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-y border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Movimento</th>
                <th className="px-4 py-2.5">Metodo</th>
                <th className="px-4 py-2.5">Ricevuta</th>
                <th className="px-4 py-2.5 text-right">Incassato</th>
                <th className="px-4 py-2.5 text-right">Residuo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {payments.map((payment) => (
                <tr key={`${payment.date}-${payment.amount}`} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-3">
                    <p className="font-semibold text-slate-900">{payment.date}</p>
                    <p className="text-[10px] text-slate-400">{payment.time}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{payment.label}</p>
                    <p className="mt-0.5 inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
                      <Check className="size-3" aria-hidden="true" /> Confermato
                    </p>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{payment.method}</td>
                  <td className="px-4 py-3">
                    <button type="button" className="font-semibold text-blue-700 hover:underline">
                      {payment.receipt}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700">+ {euro(payment.amount)}</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-950">{euro(payment.balance)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-slate-200 bg-slate-50/70 text-xs">
              <tr>
                <td colSpan={4} className="px-4 py-3 font-bold text-slate-700">Totale</td>
                <td className="px-4 py-3 text-right font-black tabular-nums text-emerald-700">{euro(COLLECTED)}</td>
                <td className="px-4 py-3 text-right font-black tabular-nums text-amber-700">{euro(OUTSTANDING)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </AdminCard>
      <RegisterPaymentCard mode="standard" />
    </div>
  );
}

function CustomerAccountView() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <AdminCard padding="none" className="overflow-hidden">
        <TableHeader
          title="Conto cliente"
          subtitle="Vista contabile con dovuto, incassato e saldo progressivo"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead className="border-y border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Data</th>
                <th className="px-4 py-2.5">Descrizione</th>
                <th className="px-4 py-2.5">Riferimento</th>
                <th className="px-4 py-2.5 text-right">Dovuto</th>
                <th className="px-4 py-2.5 text-right">Incassato</th>
                <th className="px-4 py-2.5 text-right">Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <tr>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">19 ago 2026</td>
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-900">Totale prenotazione</p>
                  <p className="text-[10px] text-slate-500">Esperienza Gourmet · Barca esclusiva</p>
                </td>
                <td className="px-4 py-3 text-slate-500">MOCK-G2401</td>
                <td className="px-4 py-3 text-right font-bold tabular-nums text-slate-950">{euro(TOTAL)}</td>
                <td className="px-4 py-3 text-right text-slate-300">—</td>
                <td className="px-4 py-3 text-right font-black tabular-nums text-amber-700">{euro(TOTAL)}</td>
              </tr>
              {payments.map((payment) => (
                <tr key={`${payment.date}-${payment.amount}`} className="hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">{payment.date}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-900">{payment.label}</p>
                    <p className="text-[10px] text-slate-500">{payment.method}</p>
                  </td>
                  <td className="px-4 py-3 font-semibold text-blue-700">{payment.receipt}</td>
                  <td className="px-4 py-3 text-right text-slate-300">—</td>
                  <td className="px-4 py-3 text-right font-bold tabular-nums text-emerald-700">{euro(payment.amount)}</td>
                  <td className="px-4 py-3 text-right font-black tabular-nums text-slate-950">{euro(payment.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-950 px-4 py-3 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Saldo cliente</p>
            <p className="text-xs text-slate-300">Importo ancora da incassare</p>
          </div>
          <p className="text-2xl font-black tabular-nums">{euro(OUTSTANDING)}</p>
        </div>
      </AdminCard>
      <RegisterPaymentCard mode="accounting" />
    </div>
  );
}

function PaymentPlanView() {
  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_390px]">
      <AdminCard padding="none" className="overflow-hidden">
        <TableHeader
          title="Piano pagamenti"
          subtitle="Le fasi già incassate restano chiuse; il saldo è subito riconoscibile"
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left">
            <thead className="border-y border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2.5">Fase</th>
                <th className="px-4 py-2.5">Scadenza</th>
                <th className="px-4 py-2.5 text-right">Previsto</th>
                <th className="px-4 py-2.5 text-right">Incassato</th>
                <th className="px-4 py-2.5">Stato</th>
                <th className="px-4 py-2.5 text-right">Azione</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              <PlanRow
                title="Acconto 30%"
                detail="Carta · Stripe"
                dueDate="19 ago 2026"
                expected={750}
                collected={750}
                status="paid"
              />
              <PlanRow
                title="Integrazione"
                detail="Bonifico bancario"
                dueDate="21 ago 2026"
                expected={500}
                collected={500}
                status="paid"
              />
              <PlanRow
                title="Saldo finale"
                detail="Prima dell'esperienza"
                dueDate="24 ago 2026"
                expected={1_250}
                collected={0}
                status="due"
              />
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3">
          <div className="flex items-center gap-2 text-[11px] text-slate-600">
            <Info className="size-3.5 shrink-0 text-slate-400" aria-hidden="true" />
            Registrando il saldo, la riga passa automaticamente a “Incassato” e la prenotazione diventa “Pagata”.
          </div>
        </div>
      </AdminCard>
      <RegisterPaymentCard mode="plan" />
    </div>
  );
}

function PlanRow({
  title,
  detail,
  dueDate,
  expected,
  collected,
  status,
}: {
  title: string;
  detail: string;
  dueDate: string;
  expected: number;
  collected: number;
  status: "paid" | "due";
}) {
  return (
    <tr className={status === "due" ? "bg-amber-50/50" : "hover:bg-slate-50/70"}>
      <td className="px-4 py-3">
        <p className="font-bold text-slate-950">{title}</p>
        <p className="text-[10px] text-slate-500">{detail}</p>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-slate-600">{dueDate}</td>
      <td className="px-4 py-3 text-right font-semibold tabular-nums text-slate-800">{euro(expected)}</td>
      <td className={`px-4 py-3 text-right font-bold tabular-nums ${collected ? "text-emerald-700" : "text-slate-300"}`}>
        {collected ? euro(collected) : "—"}
      </td>
      <td className="px-4 py-3">
        {status === "paid" ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-1 text-[10px] font-bold text-emerald-700">
            <Check className="size-3" aria-hidden="true" /> Incassato
          </span>
        ) : (
          <span className="inline-flex rounded-full bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-700">Da pagare</span>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          className={`rounded-lg px-3 py-1.5 text-[10px] font-bold ${
            status === "paid"
              ? "border border-slate-200 bg-white text-slate-600"
              : "bg-slate-950 text-white shadow-sm"
          }`}
        >
          {status === "paid" ? "Vedi ricevuta" : "Incassa saldo"}
        </button>
      </td>
    </tr>
  );
}

function TableHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5">
      <div>
        <h2 className="text-sm font-bold text-slate-950">{title}</h2>
        <p className="mt-0.5 text-[10px] text-slate-500">{subtitle}</p>
      </div>
      <button type="button" className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-700 shadow-sm">
        <FileText className="size-3.5" aria-hidden="true" /> Estratto pagamenti
      </button>
    </div>
  );
}

function RegisterPaymentCard({ mode }: { mode: "standard" | "accounting" | "plan" }) {
  const isPlan = mode === "plan";

  return (
    <AdminCard padding="none" className="h-fit overflow-hidden border-slate-300 shadow-md">
      <div className="border-b border-slate-200 bg-white px-4 py-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-950">{isPlan ? "Incassa saldo finale" : "Registra pagamento"}</h2>
            <p className="mt-0.5 text-[10px] text-slate-500">{mode === "accounting" ? "Aggiungi un movimento al conto cliente" : "Il residuo si aggiorna automaticamente"}</p>
          </div>
          <div className="flex size-8 items-center justify-center rounded-lg bg-slate-950 text-white">
            <Plus className="size-4" aria-hidden="true" />
          </div>
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-bold uppercase tracking-wide text-amber-700">Saldo residuo</span>
            <span className="text-lg font-black tabular-nums text-amber-800">{euro(OUTSTANDING)}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-amber-100">
            <div className="h-full w-1/2 rounded-full bg-emerald-500" />
          </div>
          <p className="mt-1.5 text-[10px] text-amber-700">{euro(COLLECTED)} già incassati su {euro(TOTAL)}</p>
        </div>

        <MockField label="Importo" value="1.250,00 €" prominent />

        <div className="grid grid-cols-2 gap-3">
          <MockField label="Tipo" value="Saldo" />
          <MockField label="Data" value="22/08/2026" />
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">Metodo</label>
          <div className="grid grid-cols-3 gap-1.5 rounded-xl bg-slate-100 p-1">
            <button type="button" className="rounded-lg bg-white px-2 py-2 text-[10px] font-bold text-slate-950 shadow-sm">Bonifico</button>
            <button type="button" className="rounded-lg px-2 py-2 text-[10px] font-semibold text-slate-500">Contanti</button>
            <button type="button" className="rounded-lg px-2 py-2 text-[10px] font-semibold text-slate-500">Carta</button>
          </div>
        </div>

        <MockField label="Nota interna · facoltativa" value="Saldo esperienza del 24 agosto" muted />

        <button type="button" className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-xs font-bold text-white shadow-sm hover:bg-slate-800">
          <CheckCircle2 className="size-4" aria-hidden="true" />
          Registra saldo di {euro(OUTSTANDING)}
        </button>

        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2.5">
          <p className="text-[10px] font-bold text-emerald-800">Dopo la registrazione</p>
          <div className="mt-1 flex items-center justify-between text-[10px] text-emerald-700">
            <span>Incassato {euro(TOTAL)}</span>
            <span>Da pagare {euro(0)}</span>
            <span className="font-bold">Pagata</span>
          </div>
        </div>
      </div>
    </AdminCard>
  );
}

function MockField({
  label,
  value,
  prominent = false,
  muted = false,
}: {
  label: string;
  value: string;
  prominent?: boolean;
  muted?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</label>
      <div className={`flex min-h-10 items-center rounded-lg border border-slate-200 bg-white px-3 ${prominent ? "text-base font-black text-slate-950" : muted ? "text-[11px] text-slate-400" : "text-xs font-semibold text-slate-800"}`}>
        {value}
      </div>
    </div>
  );
}
