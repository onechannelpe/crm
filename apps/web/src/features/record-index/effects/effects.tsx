import { createEffect } from "solid-js";

import { useHotkey } from "~/lib/hotkey/use-hotkey";

import { useRecordIndexViewState } from "../context/instance-context";
import type { RecordIndexScreenModel } from "../model/types";

export function RecordIndexEffects<
  T extends { id: number },
  TFilterValue extends string = string,
  TSortValue extends string = string,
>(props: { model: RecordIndexScreenModel<T, TFilterValue, TSortValue> }) {
  const viewState = useRecordIndexViewState();

  createEffect(() => {
    const visibleRowIds = new Set(
      props.model.sorting.sortedRows().map((row) => row.id),
    );
    const staleSelection = props.model.selection
      .selectedIds()
      .some((selectedId) => !visibleRowIds.has(selectedId));

    if (staleSelection) {
      props.model.selection.clear();
    }
  });

  useHotkey(
    "Escape",
    () => {
      props.model.selection.clear();
    },
    {
      enabled: () =>
        viewState.openMenu() === null &&
        props.model.selection.selectedIds().length > 0,
    },
  );

  return null;
}
