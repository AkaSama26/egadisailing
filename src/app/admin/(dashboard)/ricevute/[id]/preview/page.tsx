import Link from "next/link";
import { Download } from "lucide-react";
import { notFound } from "next/navigation";
import { getReceiptViewModel } from "@/lib/receipts/view-model";
import { PrintButton } from "../../_components/print-button";
import { ReceiptDocument } from "../../_components/receipt-document";

export default async function ReceiptPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const receipt = await getReceiptViewModel(id).catch((err) => {
    if ((err as Error & { code?: string }).code === "NOT_FOUND") notFound();
    throw err;
  });

  return (
    <div className="min-h-screen bg-slate-100 p-6 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-4xl items-center justify-between gap-3 print:hidden">
        <Link
          href={`/admin/ricevute/${receipt.id}`}
          className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        >
          Torna alla ricevuta
        </Link>
        <div className="flex gap-2">
          <PrintButton />
          <a
            href={`/api/admin/receipts/${receipt.id}/pdf`}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            <Download className="size-4" />
            PDF
          </a>
        </div>
      </div>

      <ReceiptDocument receipt={receipt} />
    </div>
  );
}
