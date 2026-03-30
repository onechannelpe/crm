import type { DataGridColumn } from "./data-grid-types";

export function isStickyDataGridColumn<T>(column: DataGridColumn<T>) {
  return column.sticky === true;
}
