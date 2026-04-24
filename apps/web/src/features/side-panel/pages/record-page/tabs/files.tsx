import { Show } from "solid-js";

import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import { ActivityTabContainer } from "~/features/side-panel/components/activity-tabs/primitives";

import type { TabContentProps } from "./content-props";
import { FilesCard } from "./files-card";

export function FilesTab(props: TabContentProps) {
  return (
    <Show
      when={props.mode === "view" ? props : undefined}
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
      {(viewProps) => (
        <FilesCard
          leadId={viewProps().data.lead.id}
          canUpload={viewProps().data.lead.stage === "CONVERTED"}
        />
      )}
    </Show>
  );
}
