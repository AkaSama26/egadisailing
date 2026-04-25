"use server";

import { z } from "zod";
import { resolveManualAlert } from "@/lib/charter/manual-alerts";
import { withAdminAction } from "@/lib/admin/with-admin-action";

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
  },
  async (input, ctx) => {
    await resolveManualAlert(input.id, ctx.userId);
  },
);
