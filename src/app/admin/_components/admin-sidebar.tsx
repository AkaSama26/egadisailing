"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  CalendarDays,
  Ship,
  BookOpen,
  DollarSign,
  UserCog,
  Users,
  BarChart3,
  Settings,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Calendario", href: "/admin/calendar", icon: CalendarDays },
  { label: "Uscite", href: "/admin/trips", icon: Ship },
  { label: "Prenotazioni", href: "/admin/bookings", icon: BookOpen },
  { label: "Prezzi", href: "/admin/pricing", icon: DollarSign },
  { label: "Crew", href: "/admin/crew", icon: UserCog },
  { label: "Clienti", href: "/admin/customers", icon: Users },
  { label: "Finanza", href: "/admin/finance", icon: BarChart3 },
  { label: "Impostazioni", href: "/admin/settings", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-64 md:flex-col md:border-r">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <Link href="/admin" className="flex items-center gap-2 font-semibold">
          <Ship className="size-5" />
          <span>Egadisailing</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => {
          const isActive =
            item.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(item.href);

          return (
            <Button
              key={item.href}
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-start gap-2"
              render={<Link href={item.href} />}
            >
              <item.icon className="size-4" />
              {item.label}
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}

export { navItems };
