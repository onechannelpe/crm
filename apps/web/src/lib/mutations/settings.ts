import { action, json } from "@solidjs/router";

import { updateProductPricing } from "~/actions/settings";
import { productCatalogQuery } from "~/lib/queries/settings";

export const updateProductPricingMutation = action(
  async (productId: number, price: number, isActive: boolean) => {
    await updateProductPricing(productId, price, isActive);
    return json({}, { revalidate: productCatalogQuery.key });
  },
  "updateProductPricing",
);
