import { createSignal, onCleanup, onMount, Show } from "solid-js";
import { Portal } from "solid-js/web";

import { useDataGridInstance } from "../context/instance-context";
import { useDataGridTable } from "../context/table-context";
import {
  autoScrollContainer,
  createSelectionBox,
  getPointRelativeToContainer,
  getSelectableRowIdsInBox,
} from "../dnd/geometry";
import type { DataGridPoint, DataGridSelectionBox } from "../dnd/types";

import styles from "../styles/data-grid.module.css";

const DRAG_SELECTION_THRESHOLD = 6;

export function DataGridDragSelectEffect() {
  const interaction = useDataGridInstance();
  const table = useDataGridTable();
  const [selectionBox, setSelectionBox] = createSignal<
    DataGridSelectionBox | undefined
  >();

  onMount(() => {
    let pointerId: number | undefined;
    let startPoint: DataGridPoint | undefined;
    let selecting = false;

    function reset() {
      pointerId = undefined;
      startPoint = undefined;
      selecting = false;
      setSelectionBox(undefined);
    }

    function handleSelectionBox(nextSelectionBox: DataGridSelectionBox) {
      const scrollWrapper = table.getScrollWrapper();
      if (!scrollWrapper || !interaction.setSelected) {
        return;
      }

      const selectedRowIds = new Set(
        getSelectableRowIdsInBox(scrollWrapper, nextSelectionBox),
      );

      for (const rowElement of scrollWrapper.querySelectorAll<HTMLElement>(
        "[data-selectable-id]",
      )) {
        const rowId = rowElement.dataset.selectableId;
        if (!rowId) {
          continue;
        }

        interaction.setSelected(rowId, selectedRowIds.has(rowId));
      }
    }

    function handlePointerDown(event: PointerEvent) {
      if (!interaction.setSelected || event.button !== 0) {
        return;
      }

      const target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      const scrollWrapper = table.getScrollWrapper();
      if (!scrollWrapper || !scrollWrapper.contains(target)) {
        return;
      }

      if (target.closest("[data-select-disable='true']")) {
        return;
      }

      pointerId = event.pointerId;
      startPoint = getPointRelativeToContainer(
        scrollWrapper,
        event.clientX,
        event.clientY,
      );
    }

    function handlePointerMove(event: PointerEvent) {
      if (
        pointerId === undefined ||
        event.pointerId !== pointerId ||
        !interaction.setSelected ||
        !startPoint
      ) {
        return;
      }

      const scrollWrapper = table.getScrollWrapper();
      if (!scrollWrapper) {
        return;
      }

      autoScrollContainer(scrollWrapper, event.clientY);

      const nextPoint = getPointRelativeToContainer(
        scrollWrapper,
        event.clientX,
        event.clientY,
      );
      const nextSelectionBox = createSelectionBox(startPoint, nextPoint);

      if (!selecting) {
        const distance = Math.max(
          Math.abs(nextPoint.x - startPoint.x),
          Math.abs(nextPoint.y - startPoint.y),
        );
        if (distance < DRAG_SELECTION_THRESHOLD) {
          return;
        }

        selecting = true;
        interaction.clearSelection();
        interaction.markRowOpenSuppressed();
      }

      setSelectionBox(nextSelectionBox);
      handleSelectionBox(nextSelectionBox);
    }

    function handlePointerUp(event: PointerEvent) {
      if (pointerId === undefined || event.pointerId !== pointerId) {
        return;
      }

      if (selecting) {
        setTimeout(() => interaction.clearPendingRowOpenSuppression(), 0);
      }
      reset();
    }

    const scrollWrapper = table.getScrollWrapper();
    scrollWrapper?.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    onCleanup(() => {
      scrollWrapper?.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    });
  });

  const overlayMount = () => table.getScrollWrapper();

  return (
    <Show when={overlayMount() && selectionBox()}>
      {(currentSelectionBox) => (
        <Portal mount={overlayMount()}>
          <div
            class={styles.dragSelectionBox}
            aria-hidden="true"
            style={{
              top: `${currentSelectionBox().top}px`,
              left: `${currentSelectionBox().left}px`,
              width: `${currentSelectionBox().width}px`,
              height: `${currentSelectionBox().height}px`,
            }}
          />
        </Portal>
      )}
    </Show>
  );
}
