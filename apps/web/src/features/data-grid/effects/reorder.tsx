import { onCleanup, onMount } from "solid-js";

import { useDataGridInstance } from "../context/instance-context";
import { useDataGridTable } from "../context/table-context";
import { autoScrollContainer, getRowIndexFromPointer } from "../dnd/geometry";

const DRAG_REORDER_THRESHOLD = 4;

export function DataGridReorderEffect() {
  const interaction = useDataGridInstance();
  const table = useDataGridTable();

  onMount(() => {
    function handlePointerMove(event: PointerEvent) {
      const activeRowId = interaction.reorderState.activeRowId();
      const sourceIndex = interaction.reorderState.sourceIndex();
      const startY = interaction.reorderState.pointerStartY();

      if (
        !interaction.hasReorder() ||
        activeRowId === undefined ||
        sourceIndex === undefined ||
        startY === undefined
      ) {
        return;
      }

      if (!interaction.isReordering()) {
        const distance = Math.abs(event.clientY - startY);
        if (distance < DRAG_REORDER_THRESHOLD) {
          return;
        }
      }

      interaction.setReorderDragging(true);
      interaction.markRowOpenSuppressed();

      autoScrollContainer(table.getScrollWrapper(), event.clientY);

      const container = table.getContainer();
      if (!container) {
        return;
      }

      const nextIndex = getRowIndexFromPointer(container, event.clientY);
      if (nextIndex !== undefined) {
        interaction.setReorderTargetIndex(nextIndex);
      }
    }

    function handlePointerUp() {
      if (!interaction.reorderState.activeRowId()) {
        return;
      }

      interaction.completeRowReorder();
      setTimeout(() => interaction.clearPendingRowOpenSuppression(), 0);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    onCleanup(() => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    });
  });

  return null;
}
