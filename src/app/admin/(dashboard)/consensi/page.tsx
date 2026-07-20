import Link from "next/link";
import type { Prisma } from "@/generated/prisma/client";
import { Cookie, Download, FileClock, ShieldCheck } from "lucide-react";
import { AdminCard } from "@/components/admin/admin-card";
import { AdminTable, type AdminTableColumn } from "@/components/admin/admin-table";
import { KpiCard } from "@/components/admin/kpi-card";
import { PageHeader } from "@/components/admin/page-header";
import { SubmitButton } from "@/components/admin/submit-button";
import { TimeIso } from "@/components/ui/time-iso";
import { db } from "@/lib/db";
import {
  getCookieConsentPolicySnapshotData,
  getCookieConsentPublicServices,
  syncCookieConsentPolicySnapshot,
} from "@/lib/cookie-consent/server";
import {
  getSiteVerificationConfig,
  maskVerificationToken,
} from "@/lib/site-verification";

const PAGE_SIZE = 50;
const CONSENT_TYPES = ["booking", "contact", "cookie"] as const;
const ACTIONS = ["FIRST_CONSENT", "UPDATE", "WITHDRAW"] as const;
const ACTION_FILTERS = ["BOOKING_REQUIRED", "CONTACT_REQUIRED", ...ACTIONS] as const;
const CATEGORIES = ["necessary", "analytics", "marketing"] as const;
const CATEGORY_FILTERS = ["privacy_terms", ...CATEGORIES] as const;

interface Props {
  searchParams: Promise<{ type?: string; action?: string; category?: string; page?: string }>;
}

interface UnifiedConsentRow {
  id: string;
  type: "booking" | "contact" | "cookie";
  createdAt: Date;
  action: string;
  acceptedItems: string[];
  rejectedItems: string[];
  policyVersion: string;
  cookieRevision: number | null;
  primary: string;
  secondary: string;
  detailRows: Array<{ label: string; value: string }>;
  bookingId: string | null;
}

function normalizeType(value: string | undefined): (typeof CONSENT_TYPES)[number] | undefined {
  return CONSENT_TYPES.includes(value as (typeof CONSENT_TYPES)[number])
    ? (value as (typeof CONSENT_TYPES)[number])
    : undefined;
}

function normalizeAction(value: string | undefined): (typeof ACTION_FILTERS)[number] | undefined {
  return ACTION_FILTERS.includes(value as (typeof ACTION_FILTERS)[number])
    ? (value as (typeof ACTION_FILTERS)[number])
    : undefined;
}

function normalizeCategory(value: string | undefined): (typeof CATEGORY_FILTERS)[number] | undefined {
  return CATEGORY_FILTERS.includes(value as (typeof CATEGORY_FILTERS)[number])
    ? (value as (typeof CATEGORY_FILTERS)[number])
    : undefined;
}

function shortHash(value: string | null): string {
  return value ? value.slice(0, 12) : "-";
}

function listLabel(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "-";
}

function consentTypeLabel(type: string): string {
  if (type === "booking") return "Prenotazione";
  if (type === "contact") return "Modulo contatti";
  return "Cookie/tracking";
}

function actionLabel(action: string): string {
  switch (action) {
    case "BOOKING_REQUIRED":
      return "Accettazione obbligatoria";
    case "CONTACT_REQUIRED":
      return "Accettazione modulo contatti";
    case "FIRST_CONSENT":
      return "Primo consenso";
    case "UPDATE":
      return "Modifica";
    case "WITHDRAW":
      return "Revoca";
    default:
      return action;
  }
}

function categoryLabel(category: string): string {
  return category === "privacy_terms" ? "Privacy + termini" : category;
}

const columns: AdminTableColumn<UnifiedConsentRow>[] = [
  {
    label: "Quando",
    render: (event) => <TimeIso datetime={event.createdAt} />,
  },
  {
    label: "Tipo",
    render: (event) => (
      <span
        className={
          event.type === "booking"
            ? "rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700"
            : event.type === "contact"
              ? "rounded-full bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700"
              : "rounded-full bg-sky-50 px-2 py-1 text-xs font-medium text-sky-700"
        }
      >
        {consentTypeLabel(event.type)}
      </span>
    ),
  },
  {
    label: "Azione",
    render: (event) => (
      <span className={event.action === "WITHDRAW" ? "font-semibold text-amber-700" : "text-slate-700"}>
        {actionLabel(event.action)}
      </span>
    ),
  },
  {
    label: "Soggetto",
    render: (event) => (
      <div className="min-w-44">
        {event.bookingId ? (
          <Link href={`/admin/prenotazioni/${event.bookingId}`} className="font-semibold text-blue-700 hover:underline">
            {event.primary}
          </Link>
        ) : (
          <div className="font-mono text-xs text-slate-900">{event.primary}</div>
        )}
        <div className="text-xs text-slate-500">{event.secondary}</div>
      </div>
    ),
  },
  {
    label: "Accettati",
    render: (event) => listLabel(event.acceptedItems),
  },
  {
    label: "Rifiutati",
    render: (event) => listLabel(event.rejectedItems),
  },
  {
    label: "Versione",
    render: (event) => (
      <span className="font-mono text-xs">
        v{event.policyVersion}
        {event.cookieRevision == null ? "" : ` · rev ${event.cookieRevision}`}
      </span>
    ),
  },
  {
    label: "Prova",
    render: (event) => (
      <details className="max-w-md">
        <summary className="cursor-pointer text-blue-700 hover:underline">dettagli</summary>
        <dl className="mt-2 grid gap-1 text-xs text-slate-600">
          {event.detailRows.map((detail) => (
            <Detail key={detail.label} label={detail.label} value={detail.value} />
          ))}
        </dl>
      </details>
    ),
  },
];

export default async function ConsensiPage({ searchParams }: Props) {
  await syncCookieConsentPolicySnapshot();

  const sp = await searchParams;
  const type = normalizeType(sp.type);
  const action = normalizeAction(sp.action);
  const category = normalizeCategory(sp.category);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;
  const queryLimit = skip + PAGE_SIZE;

  const cookieWhere: Prisma.CookieConsentEventWhereInput = {};
  if (action && ACTIONS.includes(action as (typeof ACTIONS)[number])) cookieWhere.action = action;
  if (category && category !== "privacy_terms") cookieWhere.acceptedCategories = { has: category };

  const includeBookingRows =
    (!type || type === "booking") &&
    (!action || action === "BOOKING_REQUIRED") &&
    (!category || category === "privacy_terms");
  const includeContactRows =
    (!type || type === "contact") &&
    (!action || action === "CONTACT_REQUIRED") &&
    (!category || category === "privacy_terms");
  const includeCookieRows =
    (!type || type === "cookie") &&
    (!action || ACTIONS.includes(action as (typeof ACTIONS)[number])) &&
    (!category || category !== "privacy_terms");

  const [
    bookingConsentRecords,
    bookingFilteredCount,
    contactConsentRecords,
    contactFilteredCount,
    cookieEvents,
    cookieFilteredCount,
    totalBookingConsents,
    totalContactConsents,
    totalEvents,
    analyticsAccepted,
    marketingAccepted,
    withdrawals,
    snapshots,
  ] = await Promise.all([
    includeBookingRows
      ? db.consentRecord.findMany({
          orderBy: { acceptedAt: "desc" },
          take: queryLimit,
          include: {
            booking: {
              select: {
                id: true,
                confirmationCode: true,
                status: true,
                service: { select: { name: true } },
              },
            },
            customer: {
              select: { firstName: true, lastName: true, email: true },
            },
          },
        })
      : Promise.resolve([]),
    includeBookingRows ? db.consentRecord.count() : Promise.resolve(0),
    includeContactRows
      ? db.contactConsentRecord.findMany({
          orderBy: { acceptedAt: "desc" },
          take: queryLimit,
        })
      : Promise.resolve([]),
    includeContactRows ? db.contactConsentRecord.count() : Promise.resolve(0),
    includeCookieRows
      ? db.cookieConsentEvent.findMany({
          where: cookieWhere,
          orderBy: { createdAt: "desc" },
          take: queryLimit,
        })
      : Promise.resolve([]),
    includeCookieRows ? db.cookieConsentEvent.count({ where: cookieWhere }) : Promise.resolve(0),
    db.consentRecord.count(),
    db.contactConsentRecord.count(),
    db.cookieConsentEvent.count(),
    db.cookieConsentEvent.count({ where: { acceptedCategories: { has: "analytics" } } }),
    db.cookieConsentEvent.count({ where: { acceptedCategories: { has: "marketing" } } }),
    db.cookieConsentEvent.count({ where: { action: "WITHDRAW" } }),
    db.cookieConsentPolicySnapshot.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const bookingRows: UnifiedConsentRow[] = bookingConsentRecords.map((record) => {
    const customerName = [record.customer?.firstName, record.customer?.lastName]
      .filter(Boolean)
      .join(" ")
      .trim();
    const acceptedItems = [
      record.privacyAccepted ? "Privacy Policy" : null,
      record.termsAccepted ? "Termini e condizioni" : null,
    ].filter((item): item is string => Boolean(item));
    const rejectedItems = [
      record.privacyAccepted ? null : "Privacy Policy",
      record.termsAccepted ? null : "Termini e condizioni",
    ].filter((item): item is string => Boolean(item));

    return {
      id: `booking:${record.id}`,
      type: "booking",
      createdAt: record.acceptedAt,
      action: "BOOKING_REQUIRED",
      acceptedItems,
      rejectedItems,
      policyVersion: record.policyVersion,
      cookieRevision: null,
      primary: record.booking?.confirmationCode ?? "Prenotazione non collegata",
      secondary: `${record.booking?.service.name ?? "Servizio non collegato"} · ${record.booking?.status ?? "-"} · ${customerName || "Cliente non collegato"}`,
      detailRows: [
        { label: "Record ID", value: record.id },
        { label: "Email", value: record.customer?.email ?? "-" },
        { label: "IP", value: record.ipAddress ?? "-" },
        { label: "UA", value: record.userAgent ?? "-" },
      ],
      bookingId: record.booking?.id ?? null,
    };
  });

  const contactRows: UnifiedConsentRow[] = contactConsentRecords.map((record) => ({
    id: `contact:${record.id}`,
    type: "contact",
    createdAt: record.acceptedAt,
    action: "CONTACT_REQUIRED",
    acceptedItems: [
      ...(record.privacyAccepted ? ["Privacy Policy"] : []),
      ...(record.termsAccepted ? ["Termini e condizioni"] : []),
    ],
    rejectedItems: [
      ...(!record.privacyAccepted ? ["Privacy Policy"] : []),
      ...(!record.termsAccepted ? ["Termini e condizioni"] : []),
    ],
    policyVersion: record.policyVersion,
    cookieRevision: null,
    primary: record.name,
    secondary: `${record.email} · ${record.subject}`,
    detailRows: [
      { label: "Record ID", value: record.id },
      { label: "Richiesta", value: record.submissionKey },
      { label: "Lingua", value: record.locale },
      { label: "IP", value: record.ipAddress ?? "-" },
      { label: "UA", value: record.userAgent ?? "-" },
    ],
    bookingId: null,
  }));

  const cookieRows: UnifiedConsentRow[] = cookieEvents.map((event) => ({
    id: `cookie:${event.id}`,
    type: "cookie",
    createdAt: event.createdAt,
    action: event.action,
    acceptedItems: event.acceptedCategories,
    rejectedItems: event.rejectedCategories,
    policyVersion: event.policyVersion,
    cookieRevision: event.cookieRevision,
    primary: event.consentId,
    secondary: `${event.sourcePath ?? "-"} · ${event.locale}`,
    detailRows: [
      { label: "Event ID", value: event.id },
      { label: "Accept type", value: event.acceptType },
      { label: "Changed", value: listLabel(event.changedCategories) },
      { label: "IP hash", value: event.ipHash ?? "-" },
      { label: "Config hash", value: shortHash(event.configHash) },
      { label: "Text hash", value: shortHash(event.textHash) },
      { label: "UA", value: event.userAgent ?? "-" },
    ],
    bookingId: null,
  }));

  const rows = [...bookingRows, ...contactRows, ...cookieRows]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(skip, skip + PAGE_SIZE);
  const totalFiltered = bookingFilteredCount + contactFilteredCount + cookieFilteredCount;

  const currentSnapshot = getCookieConsentPolicySnapshotData();
  const trackingServices = getCookieConsentPublicServices();
  const siteVerification = getSiteVerificationConfig();
  const totalPages = Math.max(1, Math.ceil(totalFiltered / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Consensi"
        actions={
          <Link
            href="/api/admin/cookie-consents/export"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm hover:bg-slate-50"
          >
            <Download className="size-4" />
            Esporta cookie CSV
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <KpiCard label="Consensi prenotazione" value={String(totalBookingConsents)} icon={ShieldCheck} />
        <KpiCard label="Consensi contatti" value={String(totalContactConsents)} icon={ShieldCheck} />
        <KpiCard label="Eventi cookie" value={String(totalEvents)} icon={FileClock} hint={`${withdrawals} revoche`} />
        <KpiCard label="Opt-in analytics" value={String(analyticsAccepted)} icon={Cookie} />
        <KpiCard label="Opt-in marketing" value={String(marketingAccepted)} icon={Cookie} />
      </div>

      <AdminCard>
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Policy cookie corrente
            </div>
            <div className="mt-1 font-mono">
              v{currentSnapshot.policyVersion} · rev {currentSnapshot.revision}
            </div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Config hash
            </div>
            <div className="mt-1 font-mono">{shortHash(currentSnapshot.configHash)}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Text hash
            </div>
            <div className="mt-1 font-mono">{shortHash(currentSnapshot.textHash)}</div>
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Snapshot DB
            </div>
            <div className="mt-1">{snapshots.length} versioni tracciate</div>
          </div>
        </div>
      </AdminCard>

      <AdminCard title="Integrazioni">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="py-2 pr-4">Provider</th>
                <th className="py-2 pr-4">Tipo</th>
                <th className="py-2 pr-4">Categoria consenso</th>
                <th className="py-2 pr-4">Stato</th>
                <th className="py-2">Token / ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              <IntegrationRow
                provider="Google Search Console"
                type="Verifica proprieta'"
                consentCategory="Nessuna: meta tag tecnico"
                enabled={Boolean(siteVerification.googleSiteVerification)}
                token={maskVerificationToken(siteVerification.googleSiteVerification)}
              />
              <IntegrationRow
                provider="Bing Webmaster Tools"
                type="Verifica proprieta'"
                consentCategory="Nessuna: meta tag tecnico"
                enabled={Boolean(siteVerification.bingSiteVerification)}
                token={maskVerificationToken(siteVerification.bingSiteVerification)}
              />
              <IntegrationRow
                provider="Meta domain verification"
                type="Verifica proprieta'"
                consentCategory="Nessuna: meta tag tecnico"
                enabled={Boolean(siteVerification.metaDomainVerification)}
                token={maskVerificationToken(siteVerification.metaDomainVerification)}
              />
              <IntegrationRow
                provider="Google Analytics 4"
                type="Misurazione visite"
                consentCategory="analytics"
                enabled={Boolean(trackingServices.gaMeasurementId)}
                token={maskVerificationToken(trackingServices.gaMeasurementId)}
              />
              <IntegrationRow
                provider="Google Ads"
                type="Conversioni advertising"
                consentCategory="marketing"
                enabled={Boolean(trackingServices.googleAdsId)}
                token={maskVerificationToken(trackingServices.googleAdsId)}
              />
              <IntegrationRow
                provider="Meta Pixel"
                type="Conversioni advertising"
                consentCategory="marketing"
                enabled={Boolean(trackingServices.metaPixelId)}
                token={maskVerificationToken(trackingServices.metaPixelId)}
              />
              <IntegrationRow
                provider="Microsoft Advertising / Bing UET"
                type="Conversioni advertising"
                consentCategory="marketing"
                enabled={Boolean(trackingServices.bingUetTagId)}
                token={maskVerificationToken(trackingServices.bingUetTagId)}
              />
            </tbody>
          </table>
        </div>
      </AdminCard>

      <AdminCard>
        <form className="flex flex-wrap items-end gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-500">Tipo</span>
            <select name="type" defaultValue={type ?? ""} className="rounded border px-3 py-2">
              <option value="">Tutti</option>
              {CONSENT_TYPES.map((option) => (
                <option key={option} value={option}>
                  {consentTypeLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-500">Azione</span>
            <select name="action" defaultValue={action ?? ""} className="rounded border px-3 py-2">
              <option value="">Tutte</option>
              {ACTION_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {actionLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium text-slate-500">Categoria accettata</span>
            <select name="category" defaultValue={category ?? ""} className="rounded border px-3 py-2">
              <option value="">Tutte</option>
              {CATEGORY_FILTERS.map((option) => (
                <option key={option} value={option}>
                  {categoryLabel(option)}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
            Filtra
          </SubmitButton>
          {(type || action || category) && (
            <Link href="/admin/consensi" className="pb-2 text-sm text-slate-500">
              reset
            </Link>
          )}
        </form>
      </AdminCard>

      <AdminCard padding="none" className="overflow-x-auto">
        <AdminTable<UnifiedConsentRow>
          caption="Registro consensi prenotazione, modulo contatti e cookie"
          columns={columns}
          rows={rows}
          emptyMessage="Nessun consenso registrato per i filtri selezionati."
          rowKey={(event) => event.id}
        />
      </AdminCard>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Pagina {page} di {totalPages} · {totalFiltered} consensi filtrati
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={buildPageHref(page - 1, type, action, category)} className="rounded border px-3 py-1">
              Precedente
            </Link>
          )}
          {page < totalPages && (
            <Link href={buildPageHref(page + 1, type, action, category)} className="rounded border px-3 py-1">
              Successiva
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

function IntegrationRow({
  provider,
  type,
  consentCategory,
  enabled,
  token,
}: {
  provider: string;
  type: string;
  consentCategory: string;
  enabled: boolean;
  token: string;
}) {
  return (
    <tr>
      <td className="py-2 pr-4 font-medium text-slate-900">{provider}</td>
      <td className="py-2 pr-4 text-slate-600">{type}</td>
      <td className="py-2 pr-4 font-mono text-xs text-slate-600">{consentCategory}</td>
      <td className="py-2 pr-4">
        <span
          className={`rounded-full px-2 py-1 text-xs font-medium ${
            enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
          }`}
        >
          {enabled ? "configurato" : "non configurato"}
        </span>
      </td>
      <td className="py-2 font-mono text-xs text-slate-600">{token}</td>
    </tr>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-[90px_1fr] gap-2">
      <dt className="font-medium text-slate-500">{label}</dt>
      <dd className="break-words font-mono">{value}</dd>
    </div>
  );
}

function buildPageHref(
  page: number,
  type: string | undefined,
  action: string | undefined,
  category: string | undefined,
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (type) params.set("type", type);
  if (action) params.set("action", action);
  if (category) params.set("category", category);
  return `/admin/consensi?${params.toString()}`;
}
