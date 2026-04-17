import { createMemo, createSignal, type Accessor } from "solid-js";
import type { DataGridRowId } from "../model/types";

export type DataGridSelectionModel<TId extends DataGridRowId = DataGridRowId> = {
  selectedIds: Accessor<TId[]>;
  allSelected: Accessor<boolean>;
  clear: () => void;
  setSelected: (id: TId, checked: boolean) => void;
  toggleAll: (checked: boolean) => void;
};

export function createDataGridSelection<
  TId extends DataGridRowId,
  T extends { id: TId },
>(
  rows: Accessor<T[]>,
): DataGridSelectionModel<TId> {
  const [selectedIds, setSelectedIds] = createSignal<TId[]>([]);

  const allSelected = createMemo(
    () => rows().length > 0 && selectedIds().length === rows().length,
  );

  function setSelected(id: TId, checked: boolean) {
    setSelectedIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }

      return current.filter((value) => value !== id);
    });
  }

  function toggleAll(checked: boolean) {
    setSelectedIds(checked ? rows().map((row) => row.id) : []);
  }

  function clear() {
    setSelectedIds([]);
  }

  return {
    selectedIds,
    allSelected,
    clear,
    setSelected,
    toggleAll,
  };
}
