import { createDataGridViewState } from "~/features/data-grid/hooks/use-view-state";

export function createRecordIndexViewState(
  initialVisibleColumnKeys: Set<string>,
) {
  return createDataGridViewState(initialVisibleColumnKeys);
}
