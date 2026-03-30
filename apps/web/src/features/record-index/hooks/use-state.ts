import { createSignal } from "solid-js";

export type RecordIndexMenu = "filter" | "sort" | "options" | null;

export function createRecordIndexViewState(
  initialVisibleColumnKeys: Set<string>,
) {
  const [openMenu, setOpenMenu] = createSignal<RecordIndexMenu>(null);
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
