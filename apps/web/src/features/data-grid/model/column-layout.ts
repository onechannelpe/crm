import type { DataGridColumn } from "./types";

export const REORDER_COLUMN_WIDTH = 12;
export const SELECTION_COLUMN_WIDTH = 28;
export const ADD_COLUMN_WIDTH = 32;

function toTrack<T>(column: DataGridColumn<T>) {
  if (column.width !== undefined) {
    return `${column.width}px`;
  }

  if (column.minWidth !== undefined && column.maxWidth !== undefined) {
    return `minmax(${column.minWidth}px, ${column.maxWidth}px)`;
  }

  if (column.minWidth !== undefined) {
    return `minmax(${column.minWidth}px, 1fr)`;
  }

  if (column.maxWidth !== undefined) {
    return `fit-content(${column.maxWidth}px)`;
  }

  if (column.grow) {
    return "minmax(180px, 1fr)";
  }

  return "max-content";
}

export function buildDataGridTemplateColumns<T>(
  columns: ReadonlyArray<DataGridColumn<T>>,
  options?: {
    leadingTracks?: ReadonlyArray<number>;
    trailingTracks?: ReadonlyArray<number>;
    columnWidths?: Record<string, number>;
  },
) {
  const dataTracks = columns.map((column) => {
    const override = options?.columnWidths?.[column.key];

    return override !== undefined ? `${override}px` : toTrack(column);
  });

  return [
    ...(options?.leadingTracks ?? []).map((width) => `${width}px`),
    ...dataTracks,
    ...(options?.trailingTracks ?? []).map((width) => `${width}px`),
  ].join(" ");
}

export function getStickyDataGridColumnIndex<T>(
  columns: ReadonlyArray<DataGridColumn<T>>,
) {
  return columns.findIndex((column) => column.sticky);
}
