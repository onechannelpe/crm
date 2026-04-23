import { createMemo, createSignal, type Accessor } from "solid-js";

export type DataGridSelectionModel = {
  selectedIds: Accessor<Array<string | number>>;
  allSelected: Accessor<boolean>;
  clear: () => void;
  setSelected: (id: string | number, checked: boolean) => void;
  toggleAll: (checked: boolean) => void;
};

export function createDataGridSelection<T extends { id: string | number }>(
  rows: Accessor<T[]>,
): DataGridSelectionModel {
  const [selectedIds, setSelectedIds] = createSignal<Array<string | number>>(
    [],
  );

  const allSelected = createMemo(
    () => rows().length > 0 && selectedIds().length === rows().length,
  );

  function setSelected(id: string | number, checked: boolean) {
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
