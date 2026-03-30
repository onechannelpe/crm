import { createMemo, createSignal, type Accessor } from "solid-js";

import type { RecordIndexFilterDefinition } from "../model/filter";

export function useRecordIndexFiltering<T, TValue extends string>(
  rows: Accessor<T[]>,
  filter: RecordIndexFilterDefinition<T, TValue> | undefined,
) {
  const [filterValue, setFilterValue] = createSignal<TValue | undefined>(
    filter?.defaultValue,
  );

  const filteredRows = createMemo(() => {
    const value = filterValue();
    if (!filter || value === undefined) {
      return rows();
    }

    return filter.apply(rows(), value);
  });

  const isActive = createMemo(() => {
    const value = filterValue();
    if (!filter || value === undefined) {
      return false;
    }

    return filter.isActive ? filter.isActive(value) : value !== filter.defaultValue;
  });

  return {
    filterValue,
    setFilterValue,
    filteredRows,
    isActive,
  };
}
