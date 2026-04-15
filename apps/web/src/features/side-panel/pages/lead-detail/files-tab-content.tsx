import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import { ActivityTabContainer } from "~/features/side-panel/components/activity-tabs/primitives";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";

export function FilesTabContent(_props: { data: LeadDetailView }) {
  return (
    <ActivityTabContainer>
      <ActivityTabEmptyState
        type="noFile"
        title="No Files"
        subtitle="There are no associated files with this record."
      />
    </ActivityTabContainer>
  );
}
