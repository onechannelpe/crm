import { Show } from "solid-js";

import type { LeadDetailView } from "~/contracts/workflow/views";
import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import { ActivityTabContainer } from "~/features/side-panel/components/activity-tabs/primitives";
import { FilesCard } from "~/features/side-panel/pages/record-page/tabs/files-card";

type FilesTabProps = {
  data: LeadDetailView;
};

export function FilesTab(props: FilesTabProps) {
  return (
    <Show
      when={props.data}
      fallback={
        <ActivityTabContainer>
          <ActivityTabEmptyState
            type="noFile"
            title="Sin archivos"
            subtitle="Los comprobantes se habilitan cuando la venta está convertida."
          />
        </ActivityTabContainer>
      }
    >
      <FilesCard
        leadId={props.data.lead.id}
        canUpload={props.data.lead.stage === "LIVE"}
        negotiationRequests={props.data.negotiationRequests}
      />
    </Show>
  );
}
