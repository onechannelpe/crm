import type { DataGridColumn } from "~/features/data-grid/model/types";

export function getVisibleRecordIndexColumns<T>(
  columns: ReadonlyArray<DataGridColumn<T>>,
  visibleColumnKeys: Set<string>,
) {
  return columns.filter((column) => visibleColumnKeys.has(column.key));
}

export function toggleRecordIndexVisibleColumnKey(
  visibleColumnKeys: Set<string>,
  key: string,
) {
  if (visibleColumnKeys.has(key)) {
    if (visibleColumnKeys.size === 1) {
      return visibleColumnKeys;
    }

    const next = new Set(visibleColumnKeys);
    next.delete(key);
    return next;
  }

  const next = new Set(visibleColumnKeys);
  next.add(key);
  return next;
}

export function hasHiddenRecordIndexColumns<T>(
  columns: ReadonlyArray<DataGridColumn<T>>,
  visibleColumnKeys: Set<string>,
) {
  return visibleColumnKeys.size !== columns.length;
}
