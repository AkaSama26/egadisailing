import type { Metadata } from "next";
import FinanceMockupPage from "@/app/admin/(dashboard)/mockup-finanza/page";
import { AdminSidebar } from "@/app/admin/_components/admin-sidebar";
import { AdminTopbar } from "@/app/admin/_components/admin-topbar";

export const metadata: Metadata = {
  title: "Mockup Finanza | Egadisailing",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<{ variant?: string; focus?: string }>;
}

export default function PublicFinanceMockupPage(props: PageProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <AdminSidebar />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <AdminTopbar userName="Anteprima" />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <FinanceMockupPage {...props} />
        </main>
      </div>
    </div>
  );
}
