"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import { LanguageSwitcher } from "@/components/language-switcher";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { MenuIcon } from "lucide-react";

const navLinks = [
  { key: "experiences", href: "/experiences" },
  { key: "boats", href: "/boats" },
  { key: "islands", href: "/islands" },
  { key: "about", href: "/about" },
  { key: "contacts", href: "/contacts" },
] as const;

export function Navbar() {
  const locale = useLocale();
  const pathname = usePathname();
  const t = useTranslations("nav");
  const tCommon = useTranslations("common");
  const [scrolled, setScrolled] = useState(false);

  // Pages with dark background throughout — navbar stays transparent
  const alwaysTransparent = pathname.includes("/islands") || pathname.includes("/boats") || pathname.includes("/experiences");

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 50);
    }
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isTransparent = !scrolled || alwaysTransparent;

  return (
    <header
      className={cn(
        "fixed top-0 left-0 w-full z-50 transition-all duration-300",
        !isTransparent
          ? "bg-white/90 backdrop-blur-md shadow-sm"
          : "bg-transparent"
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 lg:px-8">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className={cn(
            "font-heading text-xl font-bold tracking-tight transition-colors",
            !isTransparent ? "text-[var(--color-ocean)]" : "text-white"
          )}
        >
          Egadisailing
        </Link>

        {/* Desktop nav links */}
        <div className="hidden items-center gap-6 lg:flex">
          {navLinks.map((link) => (
            <Link
              key={link.key}
              href={`/${locale}${link.href}`}
              className={cn(
                "text-sm font-medium transition-colors hover:opacity-80",
                !isTransparent ? "text-gray-700" : "text-white"
              )}
            >
              {t(link.key)}
            </Link>
          ))}
        </div>

        {/* Desktop right side */}
        <div className="hidden items-center gap-3 lg:flex">
          <LanguageSwitcher
            className={cn(!isTransparent ? "text-gray-700" : "text-white")}
          />
          <Link
            href={`/${locale}/experiences`}
            className={cn(
              buttonVariants({ size: "default" }),
              "bg-[var(--color-gold)] text-white hover:bg-[var(--color-gold)]/90 border-none"
            )}
          >
            {tCommon("bookNow")}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <div className="lg:hidden">
          <Sheet>
            <SheetTrigger
              className={cn(
                "inline-flex items-center justify-center rounded-md p-2 transition-colors",
                scrolled
                  ? "text-gray-700 hover:bg-gray-100"
                  : "text-white hover:bg-white/10"
              )}
            >
              <MenuIcon className="size-6" />
              <span className="sr-only">Menu</span>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle className="font-heading text-lg">
                  Egadisailing
                </SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1 px-4">
                {navLinks.map((link) => (
                  <SheetClose key={link.key} render={<div />}>
                    <Link
                      href={`/${locale}${link.href}`}
                      className="block rounded-md px-3 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
                    >
                      {t(link.key)}
                    </Link>
                  </SheetClose>
                ))}
                <div className="mt-4 border-t pt-4">
                  <LanguageSwitcher className="text-gray-700" />
                </div>
                <Link
                  href={`/${locale}/experiences`}
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "mt-4 w-full bg-[var(--color-gold)] text-white hover:bg-[var(--color-gold)]/90 border-none"
                  )}
                >
                  {tCommon("bookNow")}
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </header>
  );
}
