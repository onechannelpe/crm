import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import { ActivityTabContainer } from "~/features/side-panel/components/activity-tabs/primitives";

export function FilesTab() {
  return (
    <ActivityTabContainer>
      <ActivityTabEmptyState
        type="noFile"
        title="Sin archivos"
        subtitle="No hay archivos asociados a este registro."
      />
    </ActivityTabContainer>
  );
}
