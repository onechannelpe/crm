import type { DataGridColumn } from "../model/types";

export const REORDER_COLUMN_WIDTH = 32;
export const SELECTION_COLUMN_WIDTH = 32;

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
  if (column.minWidth) return `minmax(${column.minWidth}px, 1fr)`;
  if (column.maxWidth) return `fit-content(${column.maxWidth}px)`;
  if (column.grow) return "minmax(180px, 1fr)";
  return "max-content";
}

export function buildDataGridTemplateColumns<T>(
  columns: DataGridColumn<T>[],
  options?: {
    reorderable?: boolean;
    selectable?: boolean;
    columnWidths?: Record<string, number>;
    addColumn?: boolean;
  },
) {
  const columnTracks = columns
    .map((column) => {
      const override = options?.columnWidths?.[column.key];
      return override !== undefined ? `${override}px` : toTrack(column);
    })
    .join(" ");
  const leadingTracks = [
    options?.reorderable === true ? `${REORDER_COLUMN_WIDTH}px` : null,
    options?.selectable === false ? null : `${SELECTION_COLUMN_WIDTH}px`,
  ]
    .filter(Boolean)
    .join(" ");

  if (!leadingTracks) {
    return columnTracks;
  }

  return `${leadingTracks} ${columnTracks}`;
}

export function getStickyDataGridColumnIndex<T>(columns: DataGridColumn<T>[]) {
  return columns.findIndex((column) => column.sticky);
}
