import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { CookiePreferencesButton } from "@/components/cookie-preferences-button";
import {
  PUBLIC_COMPANY_LEGAL,
  PUBLIC_CONTACT_EMAIL,
  getCompanyLegalLines,
  getEmailHref,
  getOrderedWhatsAppContacts,
  getWhatsAppLabel,
  getWhatsAppUrl,
} from "@/lib/public-contact";
import { BRAND_LOGO_SRC } from "@/lib/public-assets";
import { liquidGlassButton } from "@/lib/ui/liquid-glass";

const quickLinks = [
  { key: "experiences", href: "/experiences" },
  { key: "boats", href: "/boats" },
  { key: "islands", href: "/islands" },
  { key: "about", href: "/about" },
  { key: "contacts", href: "/contacts" },
] as const;

export function Footer() {
  const locale = useLocale();
  const tNav = useTranslations("nav");
  const tFooter = useTranslations("footer");
  const tCommon = useTranslations("common");
  const whatsappContacts = getOrderedWhatsAppContacts(locale);
  const companyLegalLines = getCompanyLegalLines();

  return (
    <footer className="bg-[var(--color-ocean)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand column */}
          <div>
            <Link
              href={`/${locale}`}
              className="inline-flex items-center gap-3 font-heading text-2xl font-bold tracking-tight"
            >
              <span className="flex h-20 w-14 shrink-0 items-center justify-center">
                <img
                  src={BRAND_LOGO_SRC}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-contain brightness-0 invert drop-shadow-[0_10px_22px_rgba(0,0,0,0.25)]"
                />
              </span>
              <span>Egadi Sailing</span>
            </Link>
            <p className="mt-3 text-sm leading-relaxed text-gray-300">
              {tFooter("tagline")}
            </p>
            {/* Social icons */}
            <div className="mt-4 flex gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Instagram"
                className={`rounded-full p-2 ${liquidGlassButton}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
                </svg>
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Facebook"
                className={`rounded-full p-2 ${liquidGlassButton}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                </svg>
              </a>
              <a
                href="https://tripadvisor.com"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="TripAdvisor"
                className={`rounded-full p-2 ${liquidGlassButton}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                </svg>
              </a>
            </div>
          </div>

          {/* Quick links column */}
          <div>
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-gray-300">
              {tFooter("quickLinks")}
            </h3>
            <ul className="mt-4 space-y-2">
              {quickLinks.map((link) => (
                <li key={link.key}>
                  <Link
                    href={`/${locale}${link.href}`}
                    className="text-sm text-gray-300 transition-colors hover:text-white"
                  >
                    {tNav(link.key)}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={`/${locale}/faq`}
                  className="text-sm text-gray-300 transition-colors hover:text-white"
                >
                  {tCommon("faq")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Contacts column */}
          <div>
            <h3 className="font-heading text-sm font-semibold uppercase tracking-wider text-gray-300">
              {tCommon("contacts")}
            </h3>
            <div className="mt-4 space-y-3 text-sm text-gray-300">
              <div className="space-y-1">
                {companyLegalLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
              <p>
                <a
                  href={getEmailHref()}
                  className="transition-colors hover:text-white"
                >
                  {PUBLIC_CONTACT_EMAIL}
                </a>
              </p>
              <div className="space-y-2">
                {whatsappContacts.map((contact) => (
                  <a
                    key={contact.key}
                    href={getWhatsAppUrl(contact, locale)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block transition-colors hover:text-white"
                  >
                    <span aria-hidden="true">{contact.flag}</span>{" "}
                    WhatsApp {getWhatsAppLabel(contact, locale)} · {contact.phoneDisplay}
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-gray-400 sm:flex-row lg:px-8">
          <p>&copy; {new Date().getFullYear()} {PUBLIC_COMPANY_LEGAL.name}. {tFooter("rights")}.</p>
          <div className="flex gap-4">
            <Link
              href={`/${locale}/privacy`}
              className="transition-colors hover:text-white"
            >
              {tFooter("privacy")}
            </Link>
            <Link
              href={`/${locale}/terms`}
              className="transition-colors hover:text-white"
            >
              {tFooter("terms")}
            </Link>
            <Link
              href={`/${locale}/cookie-policy`}
              className="transition-colors hover:text-white"
            >
              Cookie
            </Link>
            <CookiePreferencesButton label={tFooter("cookiePreferences")} />
          </div>
        </div>
      </div>
    </footer>
  );
}
