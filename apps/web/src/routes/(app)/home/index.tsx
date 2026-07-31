import type { RouteDefinition } from "@solidjs/router";

import { AppPage } from "~/components/layout/page";
import { ExecutiveGpvProgress } from "~/features/merchant-stats/ui/executive-gpv-progress";
import { executiveGpvProgressQuery } from "~/rpc/merchant-stats/executive-gpv-progress.query";

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
