import { createMemo, createSignal, type Accessor } from "solid-js";

import type { RecordIndexSortDefinition } from "../model/sort";

export function useRecordIndexSorting<T, TValue extends string>(
  rows: Accessor<T[]>,
  sort: RecordIndexSortDefinition<T, TValue> | undefined,
) {
  const [sortValue, setSortValue] = createSignal<TValue | undefined>(
    sort?.defaultValue,
  );

  const sortedRows = createMemo(() => {
    const value = sortValue();
    if (!sort || value === undefined) {
      return rows();
    }

    return sort.apply(rows(), value);
  });

  const isActive = createMemo(() => {
    const value = sortValue();
    if (!sort || value === undefined) {
      return false;
    }

    return sort.isActive ? sort.isActive(value) : value !== sort.defaultValue;
  });

  return {
    sortValue,
    setSortValue,
    sortedRows,
    isActive,
  };
}
