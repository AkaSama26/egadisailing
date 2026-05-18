"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ListChecks,
  Calendar,
  CalendarClock,
  Coins,
  Boxes,
  Map,
  Users,
  UserCog,
  LineChart,
  Plug,
  CloudSun,
  Activity,
  Settings,
  Ship,
  AlertCircle,
  ShieldCheck,
  ScanLine,
  ReceiptText,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  {
    label: "Controllo",
    items: [{ href: "/admin", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Operatività",
    items: [
      { href: "/admin/calendario", label: "Calendario", icon: Calendar },
      { href: "/admin/prenotazioni", label: "Prenotazioni", icon: ListChecks },
      { href: "/admin/check-in", label: "Check-in", icon: ScanLine },
      { href: "/admin/clienti", label: "Clienti", icon: Users },
      { href: "/admin/finanza", label: "Incassi", icon: LineChart },
      { href: "/admin/ricevute", label: "Ricevute", icon: ReceiptText },
      { href: "/admin/prezzi", label: "Listino", icon: Coins },
      { href: "/admin/itinerari", label: "Itinerari", icon: Map },
      { href: "/admin/crew", label: "Crew", icon: UserCog },
    ],
  },
  {
    label: "Azioni",
    items: [
      { href: "/admin/change-requests", label: "Cambi data", icon: CalendarClock },
      { href: "/admin/override-requests", label: "Conflitti", icon: AlertCircle },
      { href: "/admin/sync-log#manual-alerts", label: "Alert canali", icon: Plug },
      { href: "/admin/sync-log#email-fallite", label: "Email fallite", icon: Activity },
      { href: "/admin/meteo", label: "Meteo", icon: CloudSun },
    ],
  },
  {
    label: "Sistema",
    items: [
      { href: "/admin/canali", label: "Canali", icon: Plug },
      { href: "/admin/sync-log", label: "Diagnostica", icon: Activity },
      { href: "/admin/consensi", label: "Consensi", icon: ShieldCheck },
      { href: "/admin/impostazioni", label: "Sistema", icon: Settings },
      { href: "/admin/servizi", label: "Servizi", icon: Boxes },
    ],
  },
];

const navItems = navGroups.flatMap((group) => group.items);

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
      <nav className="flex-1 space-y-4 p-2 overflow-y-auto">
        {navGroups.map((group) => (
          <div key={group.label} className="space-y-1">
            <div className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {group.label}
            </div>
            {group.items.map((item) => {
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
          </div>
        ))}
      </nav>
    </aside>
  );
}

export { navGroups, navItems };
