import { type Accessor, createSignal, type Setter } from "solid-js";

import type { RecordIndexSetupColumn } from "./setup";

export type RecordIndexMenu = "filter" | "sort" | "options" | "views" | null;

export type RecordIndexFilterPanel =
  | { kind: "field-list" }
  | { kind: "field-value"; fieldId: string }
  | { kind: "any-field-search" };

// The record-index owns only view-bar chrome here: which menu is open, which
// filter panel is showing, and which columns are visible. Selection values
// (filter/sort/view/search) live on the adapter, which owns the query.
export type RecordIndexViewState = {
  openMenu: Accessor<RecordIndexMenu>;
  setOpenMenu: Setter<RecordIndexMenu>;
  visibleColumnKeys: Accessor<Set<string>>;
  setVisibleColumnKeys: Setter<Set<string>>;
  filterPanel: Accessor<RecordIndexFilterPanel>;
  setFilterPanel: Setter<RecordIndexFilterPanel>;
};

export function createRecordIndexViewState(
  columns: ReadonlyArray<RecordIndexSetupColumn>,
): RecordIndexViewState {
  const [openMenu, setOpenMenu] = createSignal<RecordIndexMenu>(null);
  const [visibleColumnKeys, setVisibleColumnKeys] = createSignal(
    new Set(columns.map((column) => column.key)),
  );
  const [filterPanel, setFilterPanel] = createSignal<RecordIndexFilterPanel>({
    kind: "field-list",
  });

  return {
    openMenu,
    setOpenMenu,
    visibleColumnKeys,
    setVisibleColumnKeys,
    filterPanel,
    setFilterPanel,
  };
}
