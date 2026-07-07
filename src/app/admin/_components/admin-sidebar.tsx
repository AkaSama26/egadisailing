"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  Calendar,
  ChevronDown,
  Coins,
  ExternalLink,
  LayoutDashboard,
  LineChart,
  ListChecks,
  Plug,
  ReceiptText,
  ScanLine,
  Settings,
  ShieldCheck,
  Ship,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: NavItem[];
}

const primaryNavItems: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/calendario", label: "Calendario", icon: Calendar },
  { href: "/admin/prenotazioni", label: "Prenotazioni", icon: ListChecks },
  { href: "/admin/check-in", label: "Check-in", icon: ScanLine },
  { href: "/admin/clienti", label: "Clienti", icon: Users },
  {
    href: "/admin/finanza",
    label: "Finanza",
    icon: LineChart,
    children: [{ href: "/admin/ricevute", label: "Ricevute", icon: ReceiptText }],
  },
  { href: "/admin/prezzi", label: "Listino", icon: Coins },
  { href: "/admin/traffico", label: "Traffico sito", icon: BarChart3 },
  { href: "/admin/impostazioni", label: "Impostazioni", icon: Settings },
];

const technicalNavItems: NavItem[] = [
  { href: "/admin/canali", label: "Canali", icon: Plug },
  { href: "/admin/sync-log", label: "Diagnostica", icon: Activity },
  { href: "/admin/consensi", label: "Consensi", icon: ShieldCheck },
];

const navGroups: Array<{ label: string; items: NavItem[] }> = [
  { label: "Operativo", items: primaryNavItems },
  { label: "Tecnico", items: technicalNavItems },
];

const navItems = navGroups.flatMap((group) =>
  group.items.flatMap((item) => [item, ...(item.children ?? [])]),
);

function isActivePath(pathname: string, href: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

function isActiveItem(pathname: string, item: NavItem): boolean {
  return (
    isActivePath(pathname, item.href) ||
    Boolean(item.children?.some((child) => isActivePath(pathname, child.href)))
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
        active
          ? "bg-slate-100 font-medium text-slate-950"
          : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <Icon className="size-4" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

function ChildNavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition ${
        active
          ? "bg-slate-100 font-medium text-slate-950"
          : "text-slate-500 hover:bg-slate-50 hover:text-slate-950"
      }`}
    >
      <Icon className="size-3.5" aria-hidden="true" />
      {item.label}
    </Link>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const technicalOpen = technicalNavItems.some((item) => isActivePath(pathname, item.href));

  return (
    <aside className="hidden bg-white md:flex md:w-64 md:flex-col md:border-r">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <Ship className="size-5" aria-hidden="true" />
          <span>Egadisailing</span>
        </Link>
      </div>
      <div className="border-b p-2">
        <Link
          href="/it"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-slate-950 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          <ExternalLink className="size-4" aria-hidden="true" />
          Apri sito
        </Link>
      </div>
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto p-2">
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Operativo
          </div>
          {primaryNavItems.map((item) => (
            <div key={item.href}>
              <NavLink item={item} active={isActiveItem(pathname, item)} />
              {item.children && (
                <div className="ml-7 mt-1 space-y-1">
                  {item.children.map((child) => (
                    <ChildNavLink
                      key={child.href}
                      item={child}
                      active={isActivePath(pathname, child.href)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="mt-auto border-t border-slate-100 pt-3">
          <details className="group" open={technicalOpen}>
            <summary className="flex cursor-pointer list-none items-center justify-between rounded-lg px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400 hover:bg-slate-50 hover:text-slate-600">
              Tecnico
              <ChevronDown className="size-4 transition group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-1 space-y-1">
              {technicalNavItems.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  active={isActivePath(pathname, item.href)}
                />
              ))}
            </div>
          </details>
        </div>
      </nav>
    </aside>
  );
}

export { navGroups, navItems, primaryNavItems, technicalNavItems, isActivePath, isActiveItem };
