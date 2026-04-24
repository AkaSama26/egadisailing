"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import {
  approveOverride,
  rejectOverride,
} from "@/lib/booking/override-request";
import {
  approveOverrideSchema,
  rejectOverrideSchema,
  type ConflictSourceChannel,
} from "@/lib/booking/override-types";
import { captureError } from "@/lib/sentry/init";

async function revalidateOverridePaths(requestId: string): Promise<void> {
  revalidatePath(`/admin/override-requests/${requestId}`);
  revalidatePath("/admin/override-requests");
  revalidatePath("/admin");
}

export async function approveOverrideAction(
  rawInput: unknown,
): Promise<{ ok: true; emailsSent: number; emailsFailed: number; refundErrors: number } | { ok: false; message: string }> {
  try {
    const { userId } = await requireAdmin();
    await enforceRateLimit({
      identifier: userId,
      scope: RATE_LIMIT_SCOPES.ADMIN_OVERRIDE_ACTION,
      limit: 30,
      windowSeconds: 60,
      failOpen: false,
    });
    const input = approveOverrideSchema.parse(rawInput);
    const otaConfirmations = input.otaConfirmations.map((c) => ({
      conflictBookingId: c.conflictBookingId ?? c.conflictId,
      channel: c.channel as ConflictSourceChannel,
      externalRef: c.externalRef,
      panelOpened: c.panelOpened,
      upstreamCancelled: c.upstreamCancelled,
      refundVerified: c.refundVerified,
      adminDeclared: c.adminDeclared,
    }));
    const result = await approveOverride(input.requestId, userId, input.notes, otaConfirmations);
    await revalidateOverridePaths(input.requestId);
    return {
      ok: true,
      emailsSent: result.emailsSent,
      emailsFailed: result.emailsFailed,
      refundErrors: result.refundErrors.length,
    };
  } catch (err) {
    captureError(err, {
      action: "approveOverrideAction",
      requestId: (rawInput as Record<string, unknown>)?.requestId,
    });
    return { ok: false, message: err instanceof Error ? err.message : "Errore sconosciuto" };
  }
}

export async function rejectOverrideAction(
  rawInput: unknown,
): Promise<{ ok: true; refundOk: boolean; emailOk: boolean } | { ok: false; message: string }> {
  try {
    const { userId } = await requireAdmin();
    await enforceRateLimit({
      identifier: userId,
      scope: RATE_LIMIT_SCOPES.ADMIN_OVERRIDE_ACTION,
      limit: 30,
      windowSeconds: 60,
      failOpen: false,
    });
    const input = rejectOverrideSchema.parse(rawInput);
    const result = await rejectOverride(input.requestId, userId, input.notes);
    await revalidateOverridePaths(input.requestId);
    return { ok: true, refundOk: result.refundOk, emailOk: result.emailOk };
  } catch (err) {
    captureError(err, {
      action: "rejectOverrideAction",
      requestId: (rawInput as Record<string, unknown>)?.requestId,
    });
    return { ok: false, message: err instanceof Error ? err.message : "Errore sconosciuto" };
  }
}
