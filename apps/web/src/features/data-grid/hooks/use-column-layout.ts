import type { DataGridColumn } from "../model/types";

export const SELECTION_COLUMN_WIDTH = 40;

function toTrack<T>(column: DataGridColumn<T>) {
  if (column.width) return `${column.width}px`;
  if (column.grow && column.minWidth && column.maxWidth) {
    return `minmax(${column.minWidth}px, ${column.maxWidth}px)`;
  }
  if (column.grow && column.minWidth) {
    return `minmax(${column.minWidth}px, 1fr)`;
  }
  if (column.minWidth && column.maxWidth) {
    return `minmax(${column.minWidth}px, ${column.maxWidth}px)`;
  }
  if (column.minWidth) return `minmax(${column.minWidth}px, max-content)`;
  if (column.maxWidth) return `fit-content(${column.maxWidth}px)`;
  if (column.grow) return "minmax(180px, 1fr)";
  return "max-content";
}

export function buildDataGridTemplateColumns<T>(
  columns: DataGridColumn<T>[],
  options?: { selectable?: boolean },
) {
  const columnTracks = columns.map((column) => toTrack(column)).join(" ");
  if (options?.selectable === false) {
    return columnTracks;
  }

  return `${SELECTION_COLUMN_WIDTH}px ${columnTracks}`;
}

export function getStickyDataGridColumnIndex<T>(columns: DataGridColumn<T>[]) {
  return columns.findIndex((column) => column.sticky);
}
