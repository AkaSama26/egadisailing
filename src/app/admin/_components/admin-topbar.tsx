"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ExternalLink, LogOut, Menu, Ship } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { isActiveItem, isActivePath, navGroups } from "./admin-sidebar";

function getInitials(name?: string | null): string {
  if (!name) return "U";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function AdminTopbar({ userName }: { userName?: string | null }) {
  const pathname = usePathname();

  return (
    <header className="flex h-14 items-center gap-4 border-b px-4">
      <Sheet>
        <SheetTrigger
          render={
            <Button variant="ghost" size="icon" className="md:hidden" />
          }
        >
          <Menu className="size-5" />
          <span className="sr-only">Menu</span>
        </SheetTrigger>
        <SheetContent side="left" className="w-72 p-0">
          <SheetHeader className="border-b">
            <SheetTitle className="flex items-center gap-2">
              <Ship className="size-5" />
              Egadisailing
            </SheetTitle>
          </SheetHeader>
          <div className="border-b p-2">
            <Link
              href="/it"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-medium text-white"
            >
              <ExternalLink className="size-4" aria-hidden="true" />
              Apri sito
            </Link>
          </div>
          <nav className="flex-1 space-y-4 p-2">
            {navGroups.map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="px-3 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {group.label}
                </div>
                {group.items.map((item) => {
                  const isActive = isActiveItem(pathname, item);
                  const Icon = item.icon;

                  return (
                    <div key={item.href}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        nativeButton={false}
                        className="w-full justify-start gap-2"
                        render={<Link href={item.href} />}
                      >
                        <Icon className="size-4" aria-hidden="true" />
                        {item.label}
                      </Button>
                      {item.children && (
                        <div className="ml-7 mt-1 space-y-1">
                          {item.children.map((child) => {
                            const childActive = isActivePath(pathname, child.href);
                            const ChildIcon = child.icon;

                            return (
                              <Button
                                key={child.href}
                                variant={childActive ? "secondary" : "ghost"}
                                nativeButton={false}
                                className="h-8 w-full justify-start gap-2 text-sm text-slate-600"
                                render={<Link href={child.href} />}
                              >
                                <ChildIcon className="size-3.5" aria-hidden="true" />
                                {child.label}
                              </Button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      <div className="ml-auto" />

      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button variant="ghost" size="icon" className="rounded-full" />
          }
        >
          <Avatar>
            <AvatarFallback>{getInitials(userName)}</AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="bottom" sideOffset={8}>
          {userName && (
            <>
              <div className="px-2 py-1.5 text-sm font-medium">{userName}</div>
              <DropdownMenuSeparator />
            </>
          )}
          <DropdownMenuItem onClick={() => signOut({ callbackUrl: "/admin/login" })}>
            <LogOut className="size-4" />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
