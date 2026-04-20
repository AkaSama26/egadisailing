"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { resolveManualAlert } from "@/lib/charter/manual-alerts";

export async function resolveAlertAction(id: string): Promise<void> {
  // R25-A2-M4: usa helper condiviso invece di inline auth check — drift
  // prevention. Tutti gli altri admin actions (R20-A3) usano requireAdmin.
  const { userId } = await requireAdmin();
  await resolveManualAlert(id, userId);
  revalidatePath("/admin/sync-log");
  revalidatePath("/admin");
}
