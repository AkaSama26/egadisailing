import { bokunClient } from "./index";
import { logger } from "@/lib/logger";

export interface BokunPriceOverrideResponse {
  id: string;
  productId: string;
  date: string;
  amount: number;
}

/**
 * Upsert di price override su Bokun per un prodotto e una data specifica.
 * Usato per hot day pricing sync (markup rispetto al sito applicato upstream).
 */
export async function upsertBokunPriceOverride(params: {
  productId: string;
  date: string; // YYYY-MM-DD
  amount: number; // EUR (Bokun converte a cents internamente)
  categoryId?: string;
}): Promise<BokunPriceOverrideResponse> {
  const res = await bokunClient().request<BokunPriceOverrideResponse>(
    "POST",
    `/activity.json/${params.productId}/price-override`,
    {
      date: params.date,
      price: params.amount,
      pricingCategoryId: params.categoryId,
    },
  );
  logger.info(
    { productId: params.productId, date: params.date, amount: params.amount, overrideId: res.id },
    "Bokun price override upserted",
  );
  return res;
}

export async function removeBokunPriceOverride(overrideId: string): Promise<void> {
  await bokunClient().request("DELETE", `/activity.json/price-override/${overrideId}`);
  logger.info({ overrideId }, "Bokun price override removed");
}
