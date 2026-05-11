import { Show, createMemo } from "solid-js";

import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import { ActivityTabContainer } from "~/features/side-panel/components/activity-tabs/primitives";

import type { TabContentProps } from "./content-props";
import { FilesCard } from "./files-card";

export function FilesTab(props: TabContentProps) {
  const viewProps = createMemo(() => (props.mode === "view" ? props : null));

  return (
    <Show
      when={viewProps()}
      keyed
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
      {(view) => (
        <FilesCard
          leadId={view.data.lead.id}
          canUpload={view.data.lead.stage === "LIVE"}
          negotiationRequests={view.data.negotiationRequests}
        />
      )}
    </Show>
  );
}
