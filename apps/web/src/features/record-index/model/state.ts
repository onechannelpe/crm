import { createSignal } from "solid-js";

import type { RecordIndexMenu, RecordIndexViewState } from "./types";

export type RecordIndexViewStateSource = {
  columns: ReadonlyArray<{ key: string }>;
  filter?: { defaultValue?: string };
  sort?: { defaultValue?: string };
};

export type RecordIndexStateOptions = {
  visibleColumnKeys: Set<string>;
  filterValue?: string;
  sortValue?: string;
};

export function createRecordIndexViewState(
  options: RecordIndexStateOptions,
): RecordIndexViewState {
  const [openMenu, setOpenMenu] = createSignal<RecordIndexMenu>(null);
  const [visibleColumnKeys, setVisibleColumnKeys] = createSignal(
    options.visibleColumnKeys,
  );
  const [filterValue, setFilterValue] = createSignal(options.filterValue);
  const [sortValue, setSortValue] = createSignal(options.sortValue);

  return {
    openMenu,
    setOpenMenu,
    visibleColumnKeys,
    setVisibleColumnKeys,
    filterValue,
    setFilterValue,
    sortValue,
    setSortValue,
  };
}

export function createRecordIndexStateOptions(
  source: RecordIndexViewStateSource,
): RecordIndexStateOptions {
  return {
    visibleColumnKeys: new Set(source.columns.map((column) => column.key)),
    filterValue: source.filter?.defaultValue,
    sortValue: source.sort?.defaultValue,
  };
}
