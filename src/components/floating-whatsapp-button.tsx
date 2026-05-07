"use client";

import { useEffect, useRef, useState } from "react";
import { CountryFlag } from "@/components/country-flag";
import { WhatsAppIcon } from "@/components/whatsapp-icon";
import {
  getOrderedWhatsAppContacts,
  getWhatsAppLabel,
  getWhatsAppUrl,
} from "@/lib/public-contact";

export function FloatingWhatsAppButton({ locale }: { locale: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const label = locale === "en" ? "WhatsApp support" : "Assistenza WhatsApp";
  const contacts = getOrderedWhatsAppContacts(locale);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div ref={rootRef} className="fixed bottom-4 right-4 z-[60]">
      {open && (
        <div className="absolute bottom-14 right-0 w-56 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-slate-900 shadow-xl shadow-slate-900/20">
          {contacts.map((contact) => (
            <a
              key={contact.key}
              href={getWhatsAppUrl(contact, locale)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-3 text-sm font-semibold transition hover:bg-slate-50"
            >
              <CountryFlag code={contact.flagCode} className="h-4 w-6" />
              <span className="flex min-w-0 flex-col">
                <span>{getWhatsAppLabel(contact, locale)}</span>
                <span className="truncate text-xs font-medium text-slate-500">
                  {contact.phoneDisplay}
                </span>
              </span>
            </a>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        title={label}
        onClick={() => setOpen((current) => !current)}
        className="whatsapp-attention-button inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white transition hover:bg-[#20BD5A] focus:outline-none focus:ring-2 focus:ring-[#25D366] focus:ring-offset-2"
      >
        <WhatsAppIcon className="block h-6 w-6 translate-x-px" />
      </button>
    </div>
  );
}
