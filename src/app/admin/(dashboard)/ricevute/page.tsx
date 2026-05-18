import Link from "next/link";
import { Plus } from "lucide-react";
import { z } from "zod";
import { db } from "@/lib/db";
import { formatItDay, parseIsoDay } from "@/lib/dates";
import { formatEur } from "@/lib/pricing/cents";
import type { Prisma } from "@/generated/prisma/client";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminTable } from "@/components/admin/admin-table";
import { PageHeader } from "@/components/admin/page-header";
import { ReceiptStatusPill } from "./_components/receipt-status-pill";

export default async function ReceiptsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const q = single(params.q)?.trim();
  const status = single(params.status);
  const from = parseIsoDayFilter(single(params.from));
  const to = parseIsoDayFilter(single(params.to));

  const where: Prisma.ReceiptWhereInput = {};
  if (q) {
    where.OR = [
      { number: { contains: q, mode: "insensitive" } },
      { recipientName: { contains: q, mode: "insensitive" } },
      { recipientEmail: { contains: q, mode: "insensitive" } },
      { booking: { is: { confirmationCode: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (status === "ACTIVE" || status === "CANCELLED") {
    where.status = status;
  }
  if (from || to) {
    where.issueDate = {
      ...(from ? { gte: parseIsoDay(from) } : {}),
      ...(to ? { lte: parseIsoDay(to) } : {}),
    };
  }

  const receipts = await db.receipt.findMany({
    where,
    include: {
      booking: { select: { id: true, confirmationCode: true } },
      _count: { select: { lineItems: true, payments: true } },
    },
    orderBy: [{ issueDate: "desc" }, { createdAt: "desc" }],
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Ricevute"
        subtitle="Documenti interni non fiscali generati dal pannello admin."
        actions={
          <Link
            href="/admin/ricevute/nuova"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="size-4" />
            Nuova ricevuta
          </Link>
        }
      />

      <AdminCard>
        <form className="grid gap-3 md:grid-cols-[1fr_160px_160px_160px_auto]">
          <label className="text-sm font-medium text-slate-700">
            Cerca
            <input
              name="q"
              defaultValue={q ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Stato
            <select
              name="status"
              defaultValue={status ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Tutti</option>
              <option value="ACTIVE">Attive</option>
              <option value="CANCELLED">Annullate</option>
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Da
            <input
              name="from"
              type="date"
              defaultValue={from ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <label className="text-sm font-medium text-slate-700">
            A
            <input
              name="to"
              type="date"
              defaultValue={to ?? ""}
              className="mt-1 block w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
          </label>
          <div className="flex items-end">
            <button className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              Filtra
            </button>
          </div>
        </form>
      </AdminCard>

      <AdminCard padding="none">
        <AdminTable
          caption="Elenco ricevute interne"
          rows={receipts}
          rowKey={(receipt) => receipt.id}
          emptyMessage="Nessuna ricevuta trovata."
          columns={[
            {
              label: "Numero",
              render: (receipt) => (
                <Link
                  href={`/admin/ricevute/${receipt.id}`}
                  className="font-mono font-semibold text-slate-900 underline-offset-2 hover:underline"
                >
                  {receipt.number}
                </Link>
              ),
            },
            {
              label: "Data",
              render: (receipt) => formatItDay(receipt.issueDate),
            },
            {
              label: "Destinatario",
              render: (receipt) => (
                <span>
                  <span className="font-medium text-slate-900">{receipt.recipientName}</span>
                  {receipt.recipientEmail && (
                    <span className="block text-xs text-slate-500">{receipt.recipientEmail}</span>
                  )}
                </span>
              ),
            },
            {
              label: "Origine",
              render: (receipt) =>
                receipt.origin === "PAYMENT"
                  ? `Pagamenti (${receipt._count.payments})`
                  : "Custom",
            },
            {
              label: "Booking",
              render: (receipt) =>
                receipt.booking ? (
                  <Link
                    href={`/admin/prenotazioni/${receipt.booking.id}`}
                    className="font-mono text-slate-700 underline-offset-2 hover:underline"
                  >
                    {receipt.booking.confirmationCode}
                  </Link>
                ) : (
                  "-"
                ),
            },
            {
              label: "Stato",
              render: (receipt) => <ReceiptStatusPill status={receipt.status} />,
            },
            {
              label: "Totale",
              align: "right",
              render: (receipt) => (
                <span className="font-mono font-semibold">
                  {formatEur(receipt.totalAmount.toString())}
                </span>
              ),
            },
          ]}
        />
      </AdminCard>
    </div>
  );
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

const isoDayFilterSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .optional();

function parseIsoDayFilter(value: string | undefined): string | undefined {
  const parsed = isoDayFilterSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}
