import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminSidebar } from "../_components/admin-sidebar";
import { AdminTopbar } from "../_components/admin-topbar";
import { Toaster } from "@/components/ui/sonner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Defense-in-depth: non basta `!session`. Se in futuro verranno introdotti
  // ruoli diversi (VIEWER/EDITOR/USER), la dashboard admin deve restare
  // limitata a role=ADMIN. Lo stesso check appare sulle route API sensibili
  // (es. /api/admin/customers/export).
  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/admin/login");
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <AdminSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopbar userName={session.user?.name} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
      <Toaster />
    </div>
  );
}
