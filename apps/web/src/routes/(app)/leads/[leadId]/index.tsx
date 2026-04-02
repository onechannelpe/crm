import { createAsync, useParams } from "@solidjs/router";
import { createSignal, Show } from "solid-js";

import { queryLeadDetail } from "~/actions/pipeline/queries/leads";
import { AppPage } from "~/components/layout/page";
import { LeadDetailOverview } from "~/features/pipeline/detail/lead-detail-overview";

export default function LeadDetailPage() {
  const params = useParams<{ leadId: string }>();
  const [refreshTick, setRefreshTick] = createSignal(0);
  const data = createAsync(() => {
    refreshTick();
    return queryLeadDetail(Number(params.leadId));
  });

  return (
    <AppPage>
      <Show
        when={data()}
        fallback={<p style={{ padding: "1.5rem" }}>Cargando...</p>}
      >
        {(detail) => (
          <LeadDetailOverview
            data={detail()}
            onChanged={() => setRefreshTick((value) => value + 1)}
          />
        )}
      </Show>
    </AppPage>
  );
}
