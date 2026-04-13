import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";

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

  return (
    <footer className="bg-[var(--color-ocean)] text-white">
      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8">
        <div className="grid gap-8 md:grid-cols-3">
          {/* Brand column */}
          <div>
            <Link
              href={`/${locale}`}
              className="font-heading text-2xl font-bold tracking-tight"
            >
              Egadisailing
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
                className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
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
                className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
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
                className="rounded-full bg-white/10 p-2 transition-colors hover:bg-white/20"
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
              <p>{tFooter("address")}</p>
              <p>
                <a
                  href="mailto:info@egadisailing.com"
                  className="transition-colors hover:text-white"
                >
                  info@egadisailing.com
                </a>
              </p>
              <p>
                <a
                  href="tel:+390000000000"
                  className="transition-colors hover:text-white"
                >
                  +39 000 000 0000
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 py-4 text-xs text-gray-400 sm:flex-row lg:px-8">
          <p>&copy; 2026 Egadisailing. {tFooter("rights")}.</p>
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
          </div>
        </div>
      </div>
    </footer>
  );
}
