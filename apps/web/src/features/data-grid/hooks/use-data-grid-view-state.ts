import { createSignal } from "solid-js";

import type { DataGridViewState } from "../model/data-grid-view-state";

export function createDataGridViewState(initialVisibleColumnKeys: Set<string>) {
  const [openMenu, setOpenMenu] =
    createSignal<DataGridViewState["openMenu"]>(null);
  const [visibleColumnKeys, setVisibleColumnKeys] = createSignal<Set<string>>(
    initialVisibleColumnKeys,
  );

  return {
    openMenu,
    setOpenMenu,
    visibleColumnKeys,
    setVisibleColumnKeys,
  };
}
