import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";
import { AppError, UnauthorizedError, ValidationError } from "@/lib/errors";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { getUserAgent } from "@/lib/http/client-ip";
import { withWebhookGuard } from "@/lib/http/with-webhook-guard";
import { withDedupedEvent } from "@/lib/dedup/processed-event";
import {
  extractLegacyBokunBookingId,
  inferLegacyBokunTopic,
  verifyBokunLegacyWebhookAuth,
} from "@/lib/bokun/legacy-webhook";
import { bookingBokunQueue } from "@/lib/queue";
import {
  createQueueJobIdentity,
  queueExecutionJobId,
} from "@/lib/queue/job-identity";

export const runtime = "nodejs";

/**
 * Adapter per Settings > Connections > Integrated Systems >
 * HTTP Booking notification.
 *
 * Bokun legacy non firma il body. La query auth contiene un digest HMAC
 * derivato dalla secret server-side; il payload e' usato soltanto per
 * estrarre l'ID. Il worker rilegge poi il booking dalle API Bokun autenticate.
 */
export const POST = withWebhookGuard(
  {
    scope: RATE_LIMIT_SCOPES.BOKUN_WEBHOOK_IP,
    label: "bokun-legacy",
  },
  async ({ body: bodyBuf, url, headers, ip }) => {
    if (!env.BOKUN_WEBHOOK_SECRET) {
      throw new AppError(
        "WEBHOOK_NOT_CONFIGURED",
        "Bokun webhook not configured",
        500,
      );
    }

    const providedAuth = url.searchParams.get("auth");
    if (
      !verifyBokunLegacyWebhookAuth(
        providedAuth,
        env.BOKUN_WEBHOOK_SECRET,
      )
    ) {
      logger.warn(
        {
          ip,
          userAgent: getUserAgent(headers),
          authPresent: Boolean(providedAuth),
        },
        "Bokun legacy webhook authentication invalid",
      );
      throw new UnauthorizedError("Invalid webhook authentication");
    }

    let payload: unknown;
    try {
      payload = JSON.parse(bodyBuf.toString("utf8"));
    } catch {
      throw new ValidationError("Invalid Bokun legacy webhook JSON");
    }

    const bookingId = extractLegacyBokunBookingId(payload);
    const topic = inferLegacyBokunTopic(payload);
    const eventId = crypto
      .createHash("sha256")
      .update("bokun-legacy-v1\0")
      .update(bodyBuf)
      .digest("hex");

    const dedup = await withDedupedEvent(
      "ProcessedBokunEvent",
      eventId,
      { topic },
      async () => {
        const identity = createQueueJobIdentity(
          `booking:bokun:${bookingId}`,
        );
        await bookingBokunQueue().add(
          "booking.webhook.process",
          {
            type: "booking.webhook.process",
            ...identity,
            data: {
              provider: "BOKUN",
              eventId,
              topic,
              bookingId,
              receivedAt: new Date().toISOString(),
            },
          },
          { jobId: queueExecutionJobId(identity) },
        );
      },
    );

    logger.info(
      { topic, bookingId, duplicate: dedup.skipped, transport: "legacy-http" },
      "Bokun legacy webhook accepted",
    );

    return NextResponse.json({
      received: true,
      ...(dedup.skipped ? { duplicate: true } : {}),
    });
  },
);
