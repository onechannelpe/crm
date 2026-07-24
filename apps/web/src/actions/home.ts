"use server";

import type { HomeMerchantPortfolioView } from "~/contracts/home/views";
import { getExecutiveMerchantPortfolio } from "~/server/merchant-stats/read/executive-portfolio";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { Ok } from "~/server/shared/result";

export async function getHomeMerchantPortfolio(): Promise<HomeMerchantPortfolioView> {
  return runAction({
    name: "home.merchantPortfolio.read",
    access: { kind: "permission", permission: "dashboards:read:own" },

    execute: async ({ actor }) =>
      Ok(
        await getExecutiveMerchantPortfolio(
          getServerRuntime().infra.db,
          actor.userId,
        ),
      ),
  });
}
