"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { resolveManualAlert } from "@/lib/charter/manual-alerts";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

export async function resolveAlertAction(id: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  if (session.user.role !== "ADMIN") throw new ForbiddenError();
  await resolveManualAlert(id, session.user.id);
  revalidatePath("/admin/sync-log");
  revalidatePath("/admin");
}
