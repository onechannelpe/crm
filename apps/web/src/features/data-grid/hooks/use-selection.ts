import {
  createMemo,
  createSignal,
  onCleanup,
  onMount,
  type Accessor,
} from "solid-js";

type DragMode = "add" | "remove" | null;

export type DataGridSelectionModel = {
  selectedIds: Accessor<number[]>;
  allSelected: Accessor<boolean>;
  clear: () => void;
  setSelected: (id: number, checked: boolean) => void;
  toggleAll: (checked: boolean) => void;
  beginSelectionDrag: (id: number) => void;
  updateSelectionDrag: (id: number) => void;
};

export function createDataGridSelection<T extends { id: number }>(
  rows: Accessor<T[]>,
): DataGridSelectionModel {
  const [selectedIds, setSelectedIds] = createSignal<number[]>([]);
  const [dragMode, setDragMode] = createSignal<DragMode>(null);

  const allSelected = createMemo(
    () => rows().length > 0 && selectedIds().length === rows().length,
  );

  function setSelected(id: number, checked: boolean) {
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
    setDragMode(null);
  }

  function beginSelectionDrag(id: number) {
    const shouldAdd = !selectedIds().includes(id);
    setDragMode(shouldAdd ? "add" : "remove");
    setSelected(id, shouldAdd);
  }

  function updateSelectionDrag(id: number) {
    const mode = dragMode();
    if (!mode) return;
    setSelected(id, mode === "add");
  }

  onMount(() => {
    const handlePointerUp = () => setDragMode(null);
    window.addEventListener("pointerup", handlePointerUp);
    onCleanup(() => window.removeEventListener("pointerup", handlePointerUp));
  });

  return {
    selectedIds,
    allSelected,
    clear,
    setSelected,
    toggleAll,
    beginSelectionDrag,
    updateSelectionDrag,
  };
}
