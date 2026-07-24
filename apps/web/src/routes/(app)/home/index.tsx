import type { RouteDefinition } from "@solidjs/router";

import { AppPage } from "~/components/layout/page";
import { HomeMerchantPortfolio } from "~/features/home/home-merchant-portfolio";
import { homeMerchantPortfolioQuery } from "~/lib/queries/home";

export const route = {
  preload: () => void homeMerchantPortfolioQuery(),
} satisfies RouteDefinition;

export default function HomePage() {
  return (
    <AppPage width="wide">
      <HomeMerchantPortfolio />
    </AppPage>
  );
}
