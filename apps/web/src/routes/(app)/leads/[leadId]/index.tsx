import { createAsync, useParams } from "@solidjs/router";
import { Show } from "solid-js";

import { getLead } from "~/actions/pipeline/leads";
import { LeadRecordOverview } from "~/components/features/leads/lead-record-overview";
import { AppPage } from "~/components/layout/page";

export default function LeadDetailPage() {
  const params = useParams<{ leadId: string }>();
  const data = createAsync(() => getLead(Number(params.leadId)));

  return (
    <AppPage>
      <Show
        when={data()}
        fallback={<p style={{ padding: "1.5rem" }}>Cargando...</p>}
      >
        {(detail) => <LeadRecordOverview data={detail()} />}
      </Show>
    </AppPage>
  );
}
