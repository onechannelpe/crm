import { createSignal, onCleanup, onMount, type Accessor } from "solid-js";

type DragMode = "add" | "remove" | null;

export function createSelectionModel<T extends { id: number }>(
  rows: Accessor<T[]>,
) {
  const [selectedIds, setSelectedIds] = createSignal<number[]>([]);
  const [dragMode, setDragMode] = createSignal<DragMode>(null);

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
    setSelected,
    toggleAll,
    beginSelectionDrag,
    updateSelectionDrag,
  };
}
