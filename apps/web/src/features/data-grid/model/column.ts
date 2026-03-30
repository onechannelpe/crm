import type { DataGridColumn } from "./types";

export function isStickyDataGridColumn<T>(column: DataGridColumn<T>) {
  return column.sticky === true;
}
