import { PageHeader } from "@/components/admin/page-header";
import { AdminCard } from "@/components/admin/admin-card";
import { isoDay } from "@/lib/dates";
import { createCustomReceiptFromForm } from "../actions";
import { ReceiptForm } from "../_components/receipt-form";

export default function NewReceiptPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuova ricevuta"
        backHref="/admin/ricevute"
        backLabel="Ricevute"
      />
      <AdminCard>
        <ReceiptForm
          action={createCustomReceiptFromForm}
          origin="CUSTOM"
          submitLabel="Crea ricevuta"
          initialValues={{
            language: "IT",
            issueDate: isoDay(new Date()),
            recipientName: "",
            recipientEmail: "",
            recipientAddress: "",
            recipientTaxId: "",
            note: "",
            lineItems: [
              {
                description: "",
                quantity: "1",
                unitPrice: "0.00",
                vatTreatment: "VAT_INCLUDED",
              },
            ],
          }}
        />
      </AdminCard>
    </div>
  );
}
