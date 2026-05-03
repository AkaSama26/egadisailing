import Link from "next/link";
import { AdminCard } from "@/components/admin/admin-card";
import { PageHeader } from "@/components/admin/page-header";
import { buttonVariants } from "@/components/ui/button";

export default async function NuovoPrezzoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Nuovo prezzo disattivato"
        subtitle="I nuovi prezzi vanno gestiti dalla matrice stagionale."
        backHref="/admin/prezzi"
        backLabel="Listino"
      />

      <AdminCard tone="warn">
        <p className="text-sm text-amber-900">
          La creazione da questa schermata e&apos; bloccata. Usa il listino stagionale per
          modificare i prezzi operativi.
        </p>
        <Link href="/admin/prezzi" className={buttonVariants({ className: "mt-4" })}>
          Torna al listino
        </Link>
      </AdminCard>
    </div>
  );
}
