import type { IndexColumn } from "./types";

export const SELECTION_COLUMN_WIDTH = 40;

export function toTrack<T>(column: IndexColumn<T>) {
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

export function buildGridTemplateColumns<T>(columns: IndexColumn<T>[]) {
  return `${SELECTION_COLUMN_WIDTH}px ${columns.map((column) => toTrack(column)).join(" ")}`;
}

export function getStickyColumnIndex<T>(columns: IndexColumn<T>[]) {
  return columns.findIndex((column) => column.sticky);
}
