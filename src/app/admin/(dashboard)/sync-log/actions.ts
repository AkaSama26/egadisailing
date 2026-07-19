"use server";

import { z } from "zod";
import { resolveManualAlert } from "@/lib/charter/manual-alerts";
import { withAdminAction } from "@/lib/admin/with-admin-action";
import {
  createRollbackReplacementEmail,
  dismissTransactionalEmail,
  retryTransactionalEmail,
} from "@/lib/email/outbox";

/**
 * Proof-of-concept migration to `withAdminAction` HOF.
 *
 * Mass migration of all admin actions deferred (gated to Phase 4 or post-D)
 * since each migration may require caller-side adapter (toast feedback,
 * useActionState, etc).
 *
 * R25-A2-M4: helper requireAdmin + rate-limit + revalidatePath + try/catch
 * tutti centralizzati nel HOF — drift prevention.
 */
export const resolveAlertAction = withAdminAction(
  {
    schema: z.object({ id: z.string().min(1) }),
    revalidatePaths: ["/admin/sync-log", "/admin"],
    rateLimitPerMin: 120,
  },
  async (input, ctx) => {
    await resolveManualAlert(input.id, ctx.userId);
  },
);

export async function resolveAlertFormAction(
  _prevState: Awaited<ReturnType<typeof resolveAlertAction>> | null,
  formData: FormData,
) {
  return resolveAlertAction({ id: formData.get("id") });
}

const emailResolutionSchema = z.object({
  id: z.string().min(1),
  reason: z.string().trim().min(5).max(500),
});

export const retryFailedEmailAction = withAdminAction(
  {
    schema: emailResolutionSchema,
    revalidatePaths: ["/admin/sync-log", "/admin"],
    rateLimitPerMin: 30,
  },
  async (input, ctx) =>
    retryTransactionalEmail({
      emailOutboxId: input.id,
      userId: ctx.userId,
      reason: input.reason,
    }),
);

export const dismissFailedEmailAction = withAdminAction(
  {
    schema: emailResolutionSchema,
    revalidatePaths: ["/admin/sync-log", "/admin"],
    rateLimitPerMin: 60,
  },
  async (input, ctx) =>
    dismissTransactionalEmail({
      emailOutboxId: input.id,
      userId: ctx.userId,
      reason: input.reason,
    }),
);

export const replaceRollbackDismissedEmailAction = withAdminAction(
  {
    schema: emailResolutionSchema,
    revalidatePaths: ["/admin/sync-log", "/admin"],
    rateLimitPerMin: 10,
  },
  async (input, ctx) =>
    createRollbackReplacementEmail({
      emailOutboxId: input.id,
      userId: ctx.userId,
      reason: input.reason,
    }),
);

export async function retryFailedEmailFormAction(
  _prevState: Awaited<ReturnType<typeof retryFailedEmailAction>> | null,
  formData: FormData,
) {
  return retryFailedEmailAction({
    id: formData.get("id"),
    reason: formData.get("reason"),
  });
}

export async function dismissFailedEmailFormAction(
  _prevState: Awaited<ReturnType<typeof dismissFailedEmailAction>> | null,
  formData: FormData,
) {
  return dismissFailedEmailAction({
    id: formData.get("id"),
    reason: formData.get("reason"),
  });
}

export async function replaceRollbackDismissedEmailFormAction(
  _prevState: Awaited<ReturnType<typeof replaceRollbackDismissedEmailAction>> | null,
  formData: FormData,
) {
  return replaceRollbackDismissedEmailAction({
    id: formData.get("id"),
    reason: formData.get("reason"),
  });
}
