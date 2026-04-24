"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import {
  approveOverride,
  rejectOverride,
} from "@/lib/booking/override-request";
import type { ConflictSourceChannel } from "@/lib/booking/override-types";

const otaConfirmationSchema = z.object({
  conflictId: z.string(),
  conflictBookingId: z.string().optional(),
  channel: z.string(),
  externalRef: z.string(),
  panelOpened: z.boolean(),
  upstreamCancelled: z.boolean(),
  refundVerified: z.boolean(),
  adminDeclared: z.boolean(),
});

const approveSchema = z.object({
  requestId: z.string().min(1),
  notes: z.string().max(500).optional(),
  otaConfirmations: z.array(otaConfirmationSchema).optional().default([]),
});

const rejectSchema = z.object({
  requestId: z.string().min(1),
  notes: z.string().max(500).optional(),
});

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
    const input = approveSchema.parse(rawInput);
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
    revalidatePath(`/admin/override-requests/${input.requestId}`);
    revalidatePath("/admin/override-requests");
    revalidatePath("/admin");
    return {
      ok: true,
      emailsSent: result.emailsSent,
      emailsFailed: result.emailsFailed,
      refundErrors: result.refundErrors.length,
    };
  } catch (err) {
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
    const input = rejectSchema.parse(rawInput);
    const result = await rejectOverride(input.requestId, userId, input.notes);
    revalidatePath(`/admin/override-requests/${input.requestId}`);
    revalidatePath("/admin/override-requests");
    revalidatePath("/admin");
    return { ok: true, refundOk: result.refundOk, emailOk: result.emailOk };
  } catch (err) {
    return { ok: false, message: err instanceof Error ? err.message : "Errore sconosciuto" };
  }
}
