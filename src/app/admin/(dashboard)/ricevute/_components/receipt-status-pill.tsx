import type { ReceiptStatus } from "@/generated/prisma/enums";

export function ReceiptStatusPill({ status }: { status: ReceiptStatus }) {
  const active = status === "ACTIVE";
  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
        active ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"
      }`}
    >
      {active ? "Attiva" : "Annullata"}
    </span>
  );
}

