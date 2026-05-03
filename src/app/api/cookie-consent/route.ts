import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { db } from "@/lib/db";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { getClientIp, getUserAgent, normalizeIpForRateLimit } from "@/lib/http/client-ip";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RL_WINDOW } from "@/lib/timing";
import {
  getCookieConsentPolicySnapshotData,
  hashCookieConsentIp,
  syncCookieConsentPolicySnapshot,
} from "@/lib/cookie-consent/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const categorySchema = z.enum(["necessary", "analytics", "marketing"]);
const serviceRecordSchema = z
  .record(z.string().min(1).max(80), z.array(z.string().min(1).max(80)).max(20))
  .default({});

const payloadSchema = z.object({
  action: z.enum(["FIRST_CONSENT", "UPDATE", "WITHDRAW"]),
  consentId: z.string().min(8).max(128),
  acceptType: z.enum(["all", "custom", "necessary"]),
  acceptedCategories: z.array(categorySchema).max(3).default([]),
  rejectedCategories: z.array(categorySchema).max(3).default([]),
  changedCategories: z.array(categorySchema).max(3).default([]),
  acceptedServices: serviceRecordSchema,
  rejectedServices: serviceRecordSchema,
  cookieRevision: z.number().int().min(0).max(9999),
  locale: z.enum(["it", "en"]).default("it"),
  sourcePath: z.string().min(1).max(2048).optional(),
});

export const POST = withErrorHandler(async (req: Request) => {
  const ip = getClientIp(req.headers);

  await enforceRateLimit({
    identifier: normalizeIpForRateLimit(ip),
    scope: RATE_LIMIT_SCOPES.COOKIE_CONSENT_IP,
    limit: 120,
    windowSeconds: RL_WINDOW.HOUR,
    // Il log consenso non deve rendere inutilizzabile il sito se Redis cade.
    failOpen: true,
  });

  const input = payloadSchema.parse(await req.json());
  const snapshot = getCookieConsentPolicySnapshotData();
  await syncCookieConsentPolicySnapshot();

  await db.cookieConsentEvent.create({
    data: {
      consentId: input.consentId,
      action: input.action,
      acceptType: input.acceptType,
      acceptedCategories: input.acceptedCategories,
      rejectedCategories: input.rejectedCategories,
      changedCategories: input.changedCategories,
      acceptedServices: input.acceptedServices as Prisma.InputJsonValue,
      rejectedServices: input.rejectedServices as Prisma.InputJsonValue,
      cookieRevision: input.cookieRevision,
      policyVersion: snapshot.policyVersion,
      configHash: snapshot.configHash,
      textHash: snapshot.textHash,
      locale: input.locale,
      sourcePath: input.sourcePath,
      ipHash: hashCookieConsentIp(ip),
      userAgent: getUserAgent(req.headers)?.slice(0, 500) ?? null,
    },
  });

  return NextResponse.json({ data: { logged: true } }, { status: 201 });
});
