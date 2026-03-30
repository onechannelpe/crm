import { createDataGridViewState } from "~/features/data-grid";

export function createRecordIndexViewState(
  initialVisibleColumnKeys: Set<string>,
) {
  return createDataGridViewState(initialVisibleColumnKeys);
}
