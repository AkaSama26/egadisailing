"use client";

import { useEffect } from "react";
import Link from "next/link";
import { CalendarDays, MessageCircle } from "lucide-react";
import { usePathname } from "next/navigation";
import { localizedStaticPath } from "@/lib/i18n/static-paths";

const BODY_CLASS = "egadi-mobile-home-sticky-cta-visible";

function normalizePath(pathname: string | null) {
  if (!pathname) return "";
  return pathname === "/" ? pathname : pathname.replace(/\/$/, "");
}

function copyForLocale(locale: string) {
  if (locale === "es") {
    return {
      contact: "Contacto",
      book: "Reservar",
      contactAria: "Ir a la página de contacto",
      bookAria: "Ir a la página de reserva",
      navAria: "Acciones rápidas de la página principal",
    };
  }
  if (locale === "fr") {
    return {
      contact: "Contact",
      book: "Réserver",
      contactAria: "Aller à la page de contact",
      bookAria: "Aller à la page de réservation",
      navAria: "Actions rapides de la page d’accueil",
    };
  }
  if (locale === "de") {
    return {
      contact: "Kontakt",
      book: "Buchen",
      contactAria: "Zur Kontaktseite",
      bookAria: "Zur Buchungsseite",
      navAria: "Schnellaktionen der Startseite",
    };
  }
  if (locale === "en") {
    return {
      contact: "Contact",
      book: "Book",
      contactAria: "Go to the contact page",
      bookAria: "Go to the booking page",
      navAria: "Homepage quick actions",
    };
  }
  return {
    contact: "Contattaci",
    book: "Prenota",
    contactAria: "Vai alla pagina contatti",
    bookAria: "Vai alla pagina prenotazione",
    navAria: "Azioni rapide homepage",
  };
}

export function MobileHomeStickyCta({ locale }: { locale: string }) {
  const pathname = usePathname();
  const homePath = normalizePath(localizedStaticPath(locale, "/"));
  const currentPath = normalizePath(pathname);
  const visible = currentPath === homePath;
  const copy = copyForLocale(locale);

  useEffect(() => {
    document.body.classList.toggle(BODY_CLASS, visible);
    return () => {
      document.body.classList.remove(BODY_CLASS);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <nav
      aria-label={copy.navAria}
      data-analytics-location="mobile_home_sticky_bar"
      className="fixed inset-x-0 bottom-0 z-[55] px-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] sm:hidden"
    >
      <div className="grid h-14 grid-cols-2 overflow-hidden rounded-full border border-white/15 bg-[#071934]/95 text-white shadow-[0_-14px_34px_rgba(7,25,52,0.28)] backdrop-blur-xl">
        <Link
          href={localizedStaticPath(locale, "/contacts")}
          aria-label={copy.contactAria}
          className="inline-flex min-w-0 items-center justify-center gap-2 border-r border-white/15 px-3 text-sm font-semibold transition active:bg-white/10"
        >
          <MessageCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{copy.contact}</span>
        </Link>
        <Link
          href={localizedStaticPath(locale, "/prenota")}
          aria-label={copy.bookAria}
          className="inline-flex min-w-0 items-center justify-center gap-2 bg-[#d97706] px-3 text-sm font-semibold text-white transition active:bg-[#b45309]"
        >
          <CalendarDays className="h-4 w-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{copy.book}</span>
        </Link>
      </div>
    </nav>
  );
}
