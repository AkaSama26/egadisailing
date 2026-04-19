import { auth } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";

/**
 * Guard per Server Actions admin-only. Wrapper sottile su `auth()` con
 * check role=ADMIN + throw coerente per AppError mapping.
 *
 * R20-A3: consolidato da 5 copie duplicate nei vari actions.ts
 * (prenotazioni, disponibilita, prezzi, crew, clienti). Il session
 * callback (src/lib/auth.ts) valida il role DB-fresco per ogni request
 * quindi questo helper non richiede altra verifica — basta leggere
 * session.user.role.
 *
 * @throws UnauthorizedError se no session (→ 401)
 * @throws ForbiddenError se role !== "ADMIN" (→ 403)
 */
export async function requireAdmin(): Promise<{ userId: string }> {
  const session = await auth();
  if (!session?.user?.id) throw new UnauthorizedError();
  if (session.user.role !== "ADMIN") throw new ForbiddenError();
  return { userId: session.user.id };
}
