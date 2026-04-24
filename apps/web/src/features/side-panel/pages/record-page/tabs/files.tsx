import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import { ActivityTabContainer } from "~/features/side-panel/components/activity-tabs/primitives";

import type { TabContentProps } from "./content-props";
import { FilesCard } from "./files-card";

export function FilesTab(props: TabContentProps) {
  if (props.mode === "create") {
    return (
      <ActivityTabContainer>
        <ActivityTabEmptyState
          type="noFile"
          title="Sin archivos"
          subtitle="Los comprobantes se habilitan cuando la venta está convertida."
        />
      </ActivityTabContainer>
    );
  }

  return (
    <FilesCard
      leadId={props.data.lead.id}
      canUpload={props.data.lead.stage === "CONVERTED"}
    />
  );
}
