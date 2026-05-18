import { z } from "zod";
import { requireAdmin } from "@/lib/auth/require-admin";
import { RATE_LIMIT_SCOPES } from "@/lib/channels";
import { enforceRateLimit } from "@/lib/rate-limit/service";
import { withErrorHandler } from "@/lib/http/with-error-handler";
import { receiptPdfFilename, renderReceiptPdfById } from "@/lib/receipts/pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const paramsSchema = z.object({ id: z.string().min(1).max(128) });

export const GET = withErrorHandler(
  async (_req: Request, ctx: unknown) => {
    const { userId } = await requireAdmin();
    await enforceRateLimit({
      identifier: userId,
      scope: RATE_LIMIT_SCOPES.ADMIN_RECEIPT_ACTION,
      limit: 60,
      windowSeconds: 60,
      failOpen: false,
    });
    const routeContext = ctx as { params: Promise<{ id: string }> };
    const { id } = paramsSchema.parse(await routeContext.params);
    const { number, bytes } = await renderReceiptPdfById(id);
    return new Response(Buffer.from(bytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${receiptPdfFilename(number)}"`,
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
      },
    });
  },
);
