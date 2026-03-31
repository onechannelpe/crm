import { onCleanup, onMount } from "solid-js";

import { useDataGridInstance } from "../context/instance-context";
import { useDataGridTable } from "../context/table-context";

type DragMode = "add" | "remove";

const DRAG_SELECTION_THRESHOLD = 5;

export function DataGridDragSelectEffect() {
  const interaction = useDataGridInstance();
  const table = useDataGridTable();

  onMount(() => {
    let pointerId: number | undefined;
    let dragMode: DragMode | undefined;
    let pendingRowId: number | undefined;
    let startY = 0;
    let started = false;

    function reset() {
      pointerId = undefined;
      dragMode = undefined;
      pendingRowId = undefined;
      startY = 0;
      started = false;
    }

    function setSelectionForRow(rowId: number) {
      if (!dragMode || !interaction.setSelected) {
        return;
      }

      interaction.setSelected(rowId, dragMode === "add");
    }

    function handlePointerDown(event: PointerEvent) {
      if (!interaction.setSelected || event.button !== 0) {
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target.closest("[data-grid-reorder-handle='true']")) {
        return;
      }

      const rowElement = target.closest<HTMLElement>("[data-grid-row-id]");
      const rowId = Number(rowElement?.dataset.gridRowId);

      if (!rowElement || Number.isNaN(rowId)) {
        return;
      }

      pointerId = event.pointerId;
      startY = event.clientY;
      pendingRowId = rowId;
      dragMode = interaction.isSelected(rowId) ? "remove" : "add";
    }

    function handlePointerMove(event: PointerEvent) {
      if (
        pointerId === undefined ||
        event.pointerId !== pointerId ||
        !interaction.setSelected
      ) {
        return;
      }

      if (!started) {
        const distance = Math.abs(event.clientY - startY);
        if (distance < DRAG_SELECTION_THRESHOLD) {
          return;
        }

        started = true;
        interaction.markRowOpenSuppressed();
        if (pendingRowId !== undefined) {
          setSelectionForRow(pendingRowId);
        }
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const rowElement = target.closest<HTMLElement>("[data-grid-row-id]");
      const rowId = Number(rowElement?.dataset.gridRowId);

      if (!rowElement || Number.isNaN(rowId)) {
        return;
      }

      setSelectionForRow(rowId);
    }

    function handlePointerUp(event: PointerEvent) {
      if (pointerId === undefined || event.pointerId !== pointerId) {
        return;
      }

      setTimeout(() => interaction.clearPendingRowOpenSuppression(), 0);
      reset();
    }

    const container = table.getContainer();
    container?.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    onCleanup(() => {
      container?.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    });
  });

  return null;
}
