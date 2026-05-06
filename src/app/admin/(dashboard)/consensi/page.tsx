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
const ACTIONS = ["FIRST_CONSENT", "UPDATE", "WITHDRAW"] as const;
const CATEGORIES = ["necessary", "analytics", "marketing"] as const;

interface Props {
  searchParams: Promise<{ action?: string; category?: string; page?: string }>;
}

interface ConsentEventRow {
  id: string;
  consentId: string;
  action: string;
  acceptType: string;
  acceptedCategories: string[];
  rejectedCategories: string[];
  changedCategories: string[];
  cookieRevision: number;
  policyVersion: string;
  configHash: string;
  textHash: string;
  locale: string;
  sourcePath: string | null;
  ipHash: string | null;
  userAgent: string | null;
  createdAt: Date;
}

function normalizeAction(value: string | undefined): (typeof ACTIONS)[number] | undefined {
  return ACTIONS.includes(value as (typeof ACTIONS)[number])
    ? (value as (typeof ACTIONS)[number])
    : undefined;
}

function normalizeCategory(value: string | undefined): (typeof CATEGORIES)[number] | undefined {
  return CATEGORIES.includes(value as (typeof CATEGORIES)[number])
    ? (value as (typeof CATEGORIES)[number])
    : undefined;
}

function shortHash(value: string | null): string {
  return value ? value.slice(0, 12) : "-";
}

function listLabel(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "-";
}

function actionLabel(action: string): string {
  switch (action) {
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

const columns: AdminTableColumn<ConsentEventRow>[] = [
  {
    label: "Quando",
    render: (event) => <TimeIso datetime={event.createdAt} />,
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
    label: "Categorie accettate",
    render: (event) => listLabel(event.acceptedCategories),
  },
  {
    label: "Categorie rifiutate",
    render: (event) => listLabel(event.rejectedCategories),
  },
  {
    label: "Versione",
    render: (event) => (
      <span className="font-mono text-xs">
        v{event.policyVersion} · rev {event.cookieRevision}
      </span>
    ),
  },
  {
    label: "Prova",
    render: (event) => (
      <details className="max-w-md">
        <summary className="cursor-pointer text-blue-700 hover:underline">dettagli</summary>
        <dl className="mt-2 grid gap-1 text-xs text-slate-600">
          <Detail label="Consent ID" value={event.consentId} />
          <Detail label="Accept type" value={event.acceptType} />
          <Detail label="Changed" value={listLabel(event.changedCategories)} />
          <Detail label="Path" value={event.sourcePath ?? "-"} />
          <Detail label="Locale" value={event.locale} />
          <Detail label="IP hash" value={event.ipHash ?? "-"} />
          <Detail label="Config hash" value={shortHash(event.configHash)} />
          <Detail label="Text hash" value={shortHash(event.textHash)} />
          <Detail label="UA" value={event.userAgent ?? "-"} />
        </dl>
      </details>
    ),
  },
];

export default async function ConsensiPage({ searchParams }: Props) {
  await syncCookieConsentPolicySnapshot();

  const sp = await searchParams;
  const action = normalizeAction(sp.action);
  const category = normalizeCategory(sp.category);
  const page = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);
  const skip = (page - 1) * PAGE_SIZE;

  const where: Prisma.CookieConsentEventWhereInput = {};
  if (action) where.action = action;
  if (category) where.acceptedCategories = { has: category };

  const [
    events,
    totalFiltered,
    totalEvents,
    analyticsAccepted,
    marketingAccepted,
    withdrawals,
    snapshots,
  ] = await Promise.all([
    db.cookieConsentEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: PAGE_SIZE,
      skip,
    }),
    db.cookieConsentEvent.count({ where }),
    db.cookieConsentEvent.count(),
    db.cookieConsentEvent.count({ where: { acceptedCategories: { has: "analytics" } } }),
    db.cookieConsentEvent.count({ where: { acceptedCategories: { has: "marketing" } } }),
    db.cookieConsentEvent.count({ where: { action: "WITHDRAW" } }),
    db.cookieConsentPolicySnapshot.findMany({
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

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
            Esporta CSV
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Eventi registrati" value={String(totalEvents)} icon={FileClock} />
        <KpiCard label="Opt-in analytics" value={String(analyticsAccepted)} icon={Cookie} />
        <KpiCard label="Opt-in marketing" value={String(marketingAccepted)} icon={Cookie} />
        <KpiCard label="Revoche" value={String(withdrawals)} icon={ShieldCheck} />
      </div>

      <AdminCard>
        <div className="grid gap-3 text-sm md:grid-cols-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">
              Policy corrente
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
            <span className="text-xs font-medium text-slate-500">Azione</span>
            <select name="action" defaultValue={action ?? ""} className="rounded border px-3 py-2">
              <option value="">Tutte</option>
              {ACTIONS.map((option) => (
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
              {CATEGORIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
          <SubmitButton className="rounded bg-slate-900 px-4 py-2 text-sm text-white">
            Filtra
          </SubmitButton>
          {(action || category) && (
            <Link href="/admin/consensi" className="pb-2 text-sm text-slate-500">
              reset
            </Link>
          )}
        </form>
      </AdminCard>

      <AdminCard padding="none" className="overflow-x-auto">
        <AdminTable<ConsentEventRow>
          caption="Registro eventi consenso cookie"
          columns={columns}
          rows={events}
          emptyMessage="Nessun consenso cookie registrato."
          rowKey={(event) => event.id}
        />
      </AdminCard>

      <div className="flex items-center justify-between text-sm text-slate-600">
        <span>
          Pagina {page} di {totalPages} · {totalFiltered} eventi filtrati
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link href={buildPageHref(page - 1, action, category)} className="rounded border px-3 py-1">
              Precedente
            </Link>
          )}
          {page < totalPages && (
            <Link href={buildPageHref(page + 1, action, category)} className="rounded border px-3 py-1">
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
  action: string | undefined,
  category: string | undefined,
): string {
  const params = new URLSearchParams();
  params.set("page", String(page));
  if (action) params.set("action", action);
  if (category) params.set("category", category);
  return `/admin/consensi?${params.toString()}`;
}
