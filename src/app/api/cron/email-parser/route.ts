import { LEASE_KEYS } from "@/lib/lease/keys";
import { withCronGuard } from "@/lib/http/with-cron-guard";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";

export const runtime = "nodejs";
export const maxDuration = 10;

/**
 * Charter email parser disattivato.
 *
 * Manteniamo la route protetta per compatibilita' con eventuali cron esterni
 * ancora configurati, ma non leggiamo piu' IMAP e non importiamo booking da
 * email. Cleanup schema/storico sara' un intervento DB separato.
 */
export const GET = withCronGuard(
  {
    scope: RATE_LIMIT_SCOPES.EMAIL_CRON_IP,
    leaseKey: LEASE_KEYS.EMAIL_PARSER,
    leaseTtlSeconds: 60,
  },
  async () => ({
    disabled: true,
    reason: "charter_email_parser_not_used",
  }),
);
