import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import { ActivityTabContainer } from "~/features/side-panel/components/activity-tabs/primitives";

export function FilesTab() {
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
