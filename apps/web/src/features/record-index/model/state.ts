import { createSignal } from "solid-js";

import type { RecordIndexSetup } from "./setup-types";
import type {
  RecordIndexFilterPanel,
  RecordIndexMenu,
  RecordIndexViewState,
} from "./types";

export type RecordIndexViewStateSource = Pick<
  RecordIndexSetup,
  "columns" | "filter" | "sort"
>;

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
  const [filterPanel, setFilterPanel] = createSignal<RecordIndexFilterPanel>({
    kind: "field-list",
  });
  const [sortValue, setSortValue] = createSignal(options.sortValue);

  return {
    openMenu,
    setOpenMenu,
    visibleColumnKeys,
    setVisibleColumnKeys,
    filterValue,
    setFilterValue,
    filterPanel,
    setFilterPanel,
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
