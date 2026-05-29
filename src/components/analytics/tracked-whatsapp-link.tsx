"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import { trackEvent } from "@/lib/analytics/client";

type TrackedWhatsAppLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  locale: string;
  contactKey: string;
  source: string;
  children: ReactNode;
};

export function TrackedWhatsAppLink({
  locale,
  contactKey,
  source,
  onClick,
  children,
  ...props
}: TrackedWhatsAppLinkProps) {
  return (
    <a
      {...props}
      onClick={(event) => {
        trackEvent("whatsapp_click", {
          locale,
          contact_key: contactKey,
          source,
        });
        onClick?.(event);
      }}
    >
      {children}
    </a>
  );
}
