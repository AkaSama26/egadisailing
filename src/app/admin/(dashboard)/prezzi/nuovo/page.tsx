import Link from "next/link";
import { AdminCard } from "@/components/admin/admin-card";
import { PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";

export default async function NuovoPrezzoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuovo prezzo legacy disattivato"
        subtitle="I nuovi prezzi vanno gestiti dalla matrice stagionale ServicePrice."
        backHref="/admin/prezzi"
        backLabel="Prezzi"
      />

      <AdminCard tone="warn">
        <p className="text-sm text-amber-900">
          La creazione di nuovi `PricingPeriod` e&apos; bloccata. I periodi legacy restano
          disponibili solo come fallback temporaneo del checkout.
        </p>
        <Link href="/admin/prezzi" className={buttonVariants({ className: "mt-4" })}>
          Torna alla matrice prezzi
        </Link>
      </AdminCard>
    </div>
  );
}
