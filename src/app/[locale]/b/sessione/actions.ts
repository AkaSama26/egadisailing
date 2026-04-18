"use server";

import { redirect } from "next/navigation";
import { revokeBookingSession } from "@/lib/session/create";
import { env } from "@/lib/env";

export async function logout(): Promise<void> {
  await revokeBookingSession();
  redirect(`/${env.APP_LOCALES_DEFAULT}/recupera-prenotazione`);
}
