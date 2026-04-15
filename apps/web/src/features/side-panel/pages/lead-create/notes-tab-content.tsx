import { ActivityTabEmptyState } from "~/features/side-panel/components/activity-tabs/empty-state";
import { ActivityTabContainer } from "~/features/side-panel/components/activity-tabs/primitives";

export function NotesTabContent() {
  return (
    <ActivityTabContainer>
      <ActivityTabEmptyState
        type="noNote"
        title="No notes"
        subtitle="There are no associated notes with this record."
      />
    </ActivityTabContainer>
  );
}
