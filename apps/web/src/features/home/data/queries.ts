import { query } from "@solidjs/router";

import { getHomeMerchantPortfolio } from "~/actions/home";
import { QUERY_KEYS } from "~/contracts/query-keys";

export const homeMerchantPortfolioQuery = query(
  getHomeMerchantPortfolio,
  QUERY_KEYS.homeMerchantPortfolio,
);
