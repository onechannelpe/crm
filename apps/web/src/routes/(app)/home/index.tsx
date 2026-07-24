import type { RouteDefinition } from "@solidjs/router";

import { AppPage } from "~/components/layout/page";
import { homeMerchantPortfolioQuery } from "~/features/home/data/queries";
import { HomeMerchantPortfolio } from "~/features/home/home-merchant-portfolio";

export const route = {
  preload: () => homeMerchantPortfolioQuery(),
} satisfies RouteDefinition;

export default function HomePage() {
  return (
    <AppPage width="wide">
      <HomeMerchantPortfolio />
    </AppPage>
  );
}
