"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Calendar,
  Coins,
  Boxes,
  Users,
  UserCog,
  LineChart,
  Plug,
  CloudSun,
  Activity,
  Settings,
  Ship,
  AlertCircle,
} from "lucide-react";

/**
 * Sidebar admin — 12 sezioni (R29: Disponibilità unificata in Calendario).
 * Rotte in italiano (spec V2). `active` matching: `/admin` esatto
 * (dashboard home) + prefix-match per sottorotte.
 */
const navItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/prenotazioni", label: "Prenotazioni", icon: ListChecks },
  { href: "/admin/calendario", label: "Calendario", icon: Calendar },
  { href: "/admin/prezzi", label: "Prezzi", icon: Coins },
  { href: "/admin/servizi", label: "Servizi", icon: Boxes },
  { href: "/admin/clienti", label: "Clienti", icon: Users },
  { href: "/admin/crew", label: "Crew", icon: UserCog },
  { href: "/admin/finanza", label: "Finanza", icon: LineChart },
  { href: "/admin/canali", label: "Canali", icon: Plug },
  { href: "/admin/override-requests", label: "Priorita'", icon: AlertCircle },
  { href: "/admin/meteo", label: "Meteo", icon: CloudSun },
  { href: "/admin/sync-log", label: "Sync & Log", icon: Activity },
  { href: "/admin/impostazioni", label: "Informazioni", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r bg-white">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <Ship className="size-5" />
          <span>Egadisailing</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2 overflow-y-auto">
        {navItems.map((item) => {
          const active =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                active
                  ? "bg-slate-100 text-slate-900 font-medium"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

export { navItems };
