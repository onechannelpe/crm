import { query } from "@solidjs/router";

import { getHomeMerchantPortfolio } from "~/actions/home";

export const homeMerchantPortfolioQuery = query(
  getHomeMerchantPortfolio,
  "homeMerchantPortfolio",
);
