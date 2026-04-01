import { createAsync, useParams } from "@solidjs/router";
import { createSignal, Show } from "solid-js";

import { getLeadDetail } from "~/actions/lead-pipeline/leads";
import { LeadRecordOverview } from "~/components/features/leads/lead-record-overview";
import { AppPage } from "~/components/layout/page";

export default function LeadDetailPage() {
  const params = useParams<{ leadId: string }>();
  const [refreshTick, setRefreshTick] = createSignal(0);
  const data = createAsync(() => {
    refreshTick();
    return getLeadDetail(Number(params.leadId));
  });

  return (
    <AppPage>
      <Show
        when={data()}
        fallback={<p style={{ padding: "1.5rem" }}>Cargando...</p>}
      >
        {(detail) => (
          <LeadRecordOverview
            data={detail()}
            onChanged={() => setRefreshTick((value) => value + 1)}
          />
        )}
      </Show>
    </AppPage>
  );
}
