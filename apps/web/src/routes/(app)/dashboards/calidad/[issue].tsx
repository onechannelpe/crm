import type { RouteDefinition } from "@solidjs/router";

import { QualityPage } from "~/features/dashboards/quality/quality-page";
import { merchantFilterOptionsQuery } from "~/lib/queries/dashboards";

export const route = {
  preload: () => void merchantFilterOptionsQuery(),
} satisfies RouteDefinition;

export default function QualityQueueRoute() {
  return <QualityPage />;
}
