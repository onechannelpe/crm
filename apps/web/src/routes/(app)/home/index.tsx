import type { RouteDefinition } from "@solidjs/router";

import { AppPage } from "~/components/layout/page";
import { executiveGpvProgressQuery } from "~/features/merchant-gpv/data/queries";
import { ExecutiveGpvProgress } from "~/features/merchant-gpv/ui/executive-gpv-progress";

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
