import type { RouteDefinition } from "@solidjs/router";

import { QualityPage } from "~/features/dashboards/quality/quality-page";
import { merchantFilterOptionsQuery } from "~/lib/queries/dashboards";

// The row list depends on the issue param, so only the seller options (needed by
// every queue's resolve editor) are worth warming here.
export const route = {
  preload: () => void merchantFilterOptionsQuery(),
} satisfies RouteDefinition;

export default function QualityQueueRoute() {
  return <QualityPage />;
}
