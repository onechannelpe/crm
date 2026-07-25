import { type RouteDefinition, useParams } from "@solidjs/router";

import { AppPage, AppPageSection } from "~/components/layout/page";
import { gpvSnapshotQuery } from "~/features/merchant-stats/data/queries";
import { ImportStatus } from "~/features/merchant-stats/upload/import-status";

export const route = {
  preload: ({ params }) =>
    params.snapshotId ? gpvSnapshotQuery(params.snapshotId) : Promise.resolve(),
} satisfies RouteDefinition;

export default function MerchantGpvImportRoute() {
  const params = useParams<{ snapshotId: string }>();

  return (
    <AppPage>
      <AppPageSection>
        <ImportStatus snapshotId={params.snapshotId} />
      </AppPageSection>
    </AppPage>
  );
}
