import { createSignal } from "solid-js";

import type { RecordIndexMenu, RecordIndexViewState } from "../model/types";

export function createRecordIndexViewState(
  initialVisibleColumnKeys: Set<string>,
  initialFilterValue?: string,
  initialSortValue?: string,
): RecordIndexViewState {
  const [openMenu, setOpenMenu] = createSignal<RecordIndexMenu>(null);
  const [visibleColumnKeys, setVisibleColumnKeys] = createSignal<Set<string>>(
    initialVisibleColumnKeys,
  );
  const [filterValue, setFilterValue] = createSignal<string | undefined>(
    initialFilterValue,
  );
  const [sortValue, setSortValue] = createSignal<string | undefined>(
    initialSortValue,
  );

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
