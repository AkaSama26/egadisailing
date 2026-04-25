import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/require-admin";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { captureError } from "@/lib/sentry/init";

export type AdminActionResult<T = void> =
  | { ok: true; data?: T }
  | { ok: false; message: string; code?: string };

export interface WithAdminActionConfig<TInput> {
  /** Zod schema per validare il payload (parsed before handler). */
  schema?: z.ZodType<TInput>;
  /** Path da revalidare post-success (puo' essere statico o derivato da input). */
  revalidatePaths?: string[] | ((input: TInput) => string[]);
  /** Rate-limit scope (default ADMIN_OVERRIDE_ACTION 30/min/user). Fail-closed. */
  rateLimitScope?: keyof typeof RATE_LIMIT_SCOPES;
  rateLimitPerMin?: number;
}

/**
 * Wrap admin Server Action con: requireAdmin + rate-limit + Zod parse +
 * try/catch (captureError on 500) + revalidatePath + result-tuple shape.
 *
 * Esempio (da chiamare DENTRO un file con "use server" directive):
 *
 *   "use server";
 *   import { withAdminAction } from "@/lib/admin/with-admin-action";
 *
 *   export const myAction = withAdminAction(
 *     { schema: mySchema, revalidatePaths: (i) => [`/admin/x/${i.id}`] },
 *     async (input, { userId }) => { ... return result; }
 *   );
 *
 * Caller:
 *   const res = await myAction(rawInput);
 *   if (!res.ok) toast.error(res.message);
 *
 * Note: handler che chiamano `redirect()` (Next.js NEXT_REDIRECT) NON
 * possono usare questo HOF — il try/catch swallow-ebbe il throw special.
 * Per quei casi, scrivere l'action manualmente.
 */
export function withAdminAction<TInput, TOutput = void>(
  config: WithAdminActionConfig<TInput>,
  handler: (input: TInput, ctx: { userId: string }) => Promise<TOutput>,
): (rawInput: unknown) => Promise<AdminActionResult<TOutput>> {
  return async (rawInput: unknown) => {
    try {
      const { userId } = await requireAdmin();
      await enforceRateLimit({
        identifier: userId,
        scope: RATE_LIMIT_SCOPES[config.rateLimitScope ?? "ADMIN_OVERRIDE_ACTION"],
        limit: config.rateLimitPerMin ?? 30,
        windowSeconds: 60,
        failOpen: false,
      });

      const input = config.schema ? config.schema.parse(rawInput) : (rawInput as TInput);
      const result = await handler(input, { userId });

      const paths =
        typeof config.revalidatePaths === "function"
          ? config.revalidatePaths(input)
          : config.revalidatePaths ?? [];
      for (const p of paths) revalidatePath(p);

      return { ok: true, data: result };
    } catch (err) {
      captureError(err as Error, {
        rawInput: typeof rawInput === "object" ? rawInput : undefined,
      });
      return {
        ok: false,
        message: err instanceof Error ? err.message : "Errore sconosciuto",
        code: (err as Error & { code?: string }).code,
      };
    }
  };
}
