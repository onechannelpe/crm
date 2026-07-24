import { createSignal, type Accessor } from "solid-js";

import type { DataGridReorderConfig } from "../dnd/types";

export type DataGridReorderController = {
  activeRowId: Accessor<string | undefined>;
  sourceIndex: Accessor<number | undefined>;
  targetIndex: Accessor<number | undefined>;
  pointerId: Accessor<number | undefined>;
  pointerStartY: Accessor<number | undefined>;
  dragging: Accessor<boolean>;
  begin: (input: {
    rowId: string;
    rowIndex: number;
    pointerId: number;
    clientY: number;
  }) => void;
  setTargetIndex: (index: number | undefined) => void;
  setDragging: (dragging: boolean) => void;
  complete: () => void;
  cancel: () => void;
  isDragged: (rowId: string) => boolean;
  isDropTarget: (rowId: string) => boolean;
};

export function createDataGridReorderController<T>(
  rows: Accessor<ReadonlyArray<T>>,
  rowId: (row: T) => string,
  config: DataGridReorderConfig<T>,
): DataGridReorderController {
  const [activeRowId, setActiveRowId] = createSignal<string>();
  const [sourceIndex, setSourceIndex] = createSignal<number>();
  const [targetIndex, setTargetIndex] = createSignal<number>();
  const [pointerId, setPointerId] = createSignal<number>();
  const [pointerStartY, setPointerStartY] = createSignal<number>();
  const [dragging, setDragging] = createSignal(false);

  function cancel() {
    setActiveRowId(undefined);
    setSourceIndex(undefined);
    setTargetIndex(undefined);
    setPointerId(undefined);
    setPointerStartY(undefined);
    setDragging(false);
  }

  return {
    activeRowId,
    sourceIndex,
    targetIndex,
    pointerId,
    pointerStartY,
    dragging,
    begin(input) {
      setActiveRowId(input.rowId);
      setSourceIndex(input.rowIndex);
      setTargetIndex(input.rowIndex);
      setPointerId(input.pointerId);
      setPointerStartY(input.clientY);
      setDragging(false);
    },
    setTargetIndex,
    setDragging,
    complete() {
      const fromIndex = sourceIndex();
      const toIndex = targetIndex();
      if (
        fromIndex !== undefined &&
        toIndex !== undefined &&
        fromIndex !== toIndex
      ) {
        const currentRows = rows();
        const row = currentRows[fromIndex];
        if (row) {
          config.onReorder({
            fromIndex,
            toIndex,
            row,
            rows: currentRows,
          });
        }
      }

      cancel();
    },
    cancel,
    isDragged: (id) => activeRowId() === id && dragging(),
    isDropTarget(id) {
      const index = targetIndex();
      if (index === undefined) return false;
      const row = rows()[index];
      return row !== undefined && rowId(row) === id;
    },
  };
}
