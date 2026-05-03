import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/require-admin";
import { withErrorHandler } from "@/lib/http/with-error-handler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_LIMIT = 10_000;

export const GET = withErrorHandler(async () => {
  await requireAdmin();

  const events = await db.cookieConsentEvent.findMany({
    orderBy: { createdAt: "desc" },
    take: EXPORT_LIMIT,
  });

  const header = [
    "ID",
    "Creato",
    "Consent ID",
    "Azione",
    "Accept type",
    "Categorie accettate",
    "Categorie rifiutate",
    "Categorie cambiate",
    "Servizi accettati",
    "Servizi rifiutati",
    "Policy version",
    "Revision",
    "Locale",
    "Source path",
    "IP hash",
    "Config hash",
    "Text hash",
    "User agent",
  ].join(",");

  const rows = events.map((event) =>
    [
      event.id,
      event.createdAt.toISOString(),
      event.consentId,
      event.action,
      event.acceptType,
      event.acceptedCategories.join("|"),
      event.rejectedCategories.join("|"),
      event.changedCategories.join("|"),
      stringifyJson(event.acceptedServices),
      stringifyJson(event.rejectedServices),
      event.policyVersion,
      event.cookieRevision.toString(),
      event.locale,
      event.sourcePath ?? "",
      event.ipHash ?? "",
      event.configHash,
      event.textHash,
      event.userAgent ?? "",
    ]
      .map(escapeCsv)
      .join(","),
  );

  const csv = [header, ...rows].join("\n");

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="cookie-consents.csv"',
    },
  });
});

function stringifyJson(value: unknown): string {
  return JSON.stringify(value);
}

function escapeCsv(value: string): string {
  const needsFormulaGuard = /^[=+\-@\t\r]/.test(value);
  const guarded = needsFormulaGuard ? `'${value}` : value;
  if (guarded.includes(",") || guarded.includes('"') || guarded.includes("\n")) {
    return `"${guarded.replace(/"/g, '""')}"`;
  }
  return guarded;
}
