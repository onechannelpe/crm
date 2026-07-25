import type { RouteDefinition } from "@solidjs/router";

import { AppPage } from "~/components/layout/page";
import { executiveGpvProgressQuery } from "~/features/merchant-stats/data/queries";
import { ExecutiveGpvProgress } from "~/features/merchant-stats/ui/executive-gpv-progress";

export const route = {
  preload: () => executiveGpvProgressQuery(),
} satisfies RouteDefinition;

export default function HomePage() {
  return (
    <AppPage width="wide">
      <ExecutiveGpvProgress />
    </AppPage>
  );
}
