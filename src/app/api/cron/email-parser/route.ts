import { LEASE_KEYS } from "@/lib/lease/keys";
import {
  imapConfigFromEnv,
  fetchUnseenEmails,
  markEmailsSeen,
} from "@/lib/email-parser/imap-client";
import { dispatch } from "@/lib/email-parser/dispatcher";
import { wasMessageProcessed, markMessageProcessed } from "@/lib/email-parser/dedup";
import { importCharterBooking } from "@/lib/charter/booking-import";
import { logger } from "@/lib/logger";
import { withCronGuard } from "@/lib/http/with-cron-guard";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { db } from "@/lib/db";
import { dispatchNotification, defaultNotificationChannels } from "@/lib/notifications/dispatcher";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Cron ogni 5 min: legge INBOX IMAP, dispatcha per dominio mittente,
 * parsa email SamBoat/Click&Boat/Nautal, importa come charter booking,
 * marca email come SEEN solo dopo successo del processing (at-least-once).
 *
 * Anti-overrun: Redis lease single-flight (cross-replica) via withCronGuard.
 *
 * R20-P2-MEDIA: uniformato a hyphen (era underscore, drift vs altri cron).
 * Al prossimo deploy il vecchio lease `cron:email_parser` in Redis scade
 * via TTL 8min — nessun fix manuale richiesto.
 *
 * Boat resolution: oggi default al primo boat attivo. In Plan 5, admin
 * potra' mappare "boatName in subject" → boatId esplicito.
 */
export const GET = withCronGuard(
  {
    scope: RATE_LIMIT_SCOPES.EMAIL_CRON_IP,
    leaseKey: LEASE_KEYS.EMAIL_PARSER,
    leaseTtlSeconds: 8 * 60,
  },
  async (_req, _ctx) => {
    const cfg = imapConfigFromEnv();
    if (!cfg) {
      logger.warn("IMAP not configured, skipping charter email parser");
      return { skipped: "imap_not_configured" };
    }

    const runStartedAt = Date.now();
    const emails = await fetchUnseenEmails(cfg);
    const processedUids: number[] = [];
    const errors: Array<{ uid: number; error: string }> = [];
    let imported = 0;
    let skippedDedup = 0;
    let skippedUnmatched = 0;
    let skippedUnparsed = 0;

    const defaultBoat = await db.boat.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });

    for (const email of emails) {
      try {
        if (await wasMessageProcessed(email.messageId, email.from)) {
          processedUids.push(email.uid);
          skippedDedup++;
          continue;
        }

        const dispatched = dispatch(email);
        if (!dispatched.platform) {
          // Non e' una charter platform conosciuta — marca letta per non riprocessare.
          processedUids.push(email.uid);
          skippedUnmatched++;
          continue;
        }

        if (!dispatched.extracted) {
          // Dominio matched ma template failed to parse — lascia UNSEEN per review
          // manuale admin. Logghiamo warn con messageId (no PII).
          logger.warn(
            {
              platform: dispatched.platform,
              subject: email.subject,
              messageIdHash: email.messageId.slice(-16),
            },
            "Charter email platform matched but parser returned null — admin review",
          );
          await dispatchNotification({
            type: "SYNC_FAILURE",
            channels: defaultNotificationChannels(),
            payload: {
              queueName: "cron:email-parser",
              jobName: "charter-email-parser",
              jobId: String(email.uid),
              attemptsMade: 1,
              errorCode: "CHARTER_PARSE_FAILED",
              errorMessage: `${dispatched.platform} email riconosciuta ma non parsabile. Controllare inbox manualmente.`,
            },
            emailIdempotencyKey: `charter-parser-unparsed:${email.messageId}`,
          }).catch((err) =>
            logger.warn({ err, uid: email.uid }, "Charter parser admin notification failed"),
          );
          skippedUnparsed++;
          continue;
        }

        if (!defaultBoat) {
          throw new Error("No active Boat configured for charter ingest");
        }

        await importCharterBooking({
          ...dispatched.extracted,
          platform: dispatched.platform,
          boatId: defaultBoat.id,
        });
        await markMessageProcessed(email.messageId, email.from, dispatched.platform);
        processedUids.push(email.uid);
        imported++;
      } catch (err) {
        logger.error(
          { uid: email.uid, errMessage: (err as Error).message },
          "Charter email processing failed",
        );
        errors.push({ uid: email.uid, error: String(err) });
      }
    }

    await markEmailsSeen(cfg, processedUids).catch((err) => {
      logger.error({ err }, "IMAP markEmailsSeen failed — some emails may be re-processed");
    });

    const durationMs = Date.now() - runStartedAt;
    logger.info(
      {
        fetched: emails.length,
        imported,
        skippedDedup,
        skippedUnmatched,
        skippedUnparsed,
        errors: errors.length,
        durationMs,
      },
      "Charter email parser run completed",
    );

    return {
      fetched: emails.length,
      imported,
      skippedDedup,
      skippedUnmatched,
      skippedUnparsed,
      errors,
      durationMs,
    };
  },
);
