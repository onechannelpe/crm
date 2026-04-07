import { createAsync } from "@solidjs/router";
import { createMemo, createSignal, Show } from "solid-js";

import { queryLeadDetail } from "~/actions/pipeline/queries/leads";
import { LeadDetailOverview } from "~/features/pipeline/detail/lead-detail-overview";

import { SidePanelList } from "../../components/list";
import { useSidePanelPageInstanceId } from "../../state/page-instance";
import { useSidePanel } from "../../state/use-side-panel";

export function LeadDetailPage() {
  const pageId = useSidePanelPageInstanceId();
  const { getPageState } = useSidePanel();

  const pageState = createMemo(() => {
    const state = getPageState(pageId());

    if (!state || state.page !== "lead-detail") {
      throw new Error("Lead detail side panel page state is not available");
    }

    return state;
  });

  const [refreshTick, setRefreshTick] = createSignal(0);
  const data = createAsync(() => {
    refreshTick();
    return queryLeadDetail(pageState().leadId);
  });

  return (
    <SidePanelList>
      <Show
        when={data()}
        fallback={
          <div style={{ padding: "12px 0", "font-size": "13px" }}>
            Cargando...
          </div>
        }
      >
        {(detail) => (
          <LeadDetailOverview
            data={detail()}
            compact
            onChanged={() => setRefreshTick((value) => value + 1)}
          />
        )}
      </Show>
    </SidePanelList>
  );
}
