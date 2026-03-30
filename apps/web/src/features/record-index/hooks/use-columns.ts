import { createMemo } from "solid-js";

import type { DataGridColumn } from "~/features/data-grid/model/types";

import { createRecordIndexViewState } from "./use-state";

export function useRecordIndexColumns<T>(
  columns: ReadonlyArray<DataGridColumn<T>>,
) {
  const viewState = createRecordIndexViewState(
    new Set(columns.map((column) => column.key)),
  );

  const visibleColumns = createMemo(() =>
    columns.filter((column) => viewState.visibleColumnKeys().has(column.key)),
  );

  function toggleColumn(key: string) {
    viewState.setVisibleColumnKeys((current) => {
      if (current.has(key)) {
        if (current.size === 1) {
          return current;
        }

        const next = new Set(current);
        next.delete(key);
        return next;
      }

      const next = new Set(current);
      next.add(key);
      return next;
    });
  }

  const hasHiddenColumns = createMemo(
    () => viewState.visibleColumnKeys().size !== columns.length,
  );

  return {
    ...viewState,
    visibleColumns,
    toggleColumn,
    hasHiddenColumns,
  };
}
