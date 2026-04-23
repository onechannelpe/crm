import {
  createEffect,
  createMemo,
  createSignal,
  type Accessor,
} from "solid-js";

import { getVerticalNavigationAction } from "~/lib/keyboard/list-navigation";

import type { DataGridReorderConfig } from "../dnd/types";
import type { DataGridRowOpenMode } from "../model/row-open";
import type { DataGridSelectionModel } from "./use-selection";

export type DataGridInteractionModel = {
  isRowActive: (id: string) => boolean;
  isRowDragged: (id: string) => boolean;
  isRowDropTarget: (id: string) => boolean;
  isRowFocused: (id: string) => boolean;
  isSelected: (id: string) => boolean;
  selectedIds: Accessor<string[]>;
  hasActiveRow: Accessor<boolean>;
  hasPendingRowOpenSuppression: Accessor<boolean>;
  hasReorder: Accessor<boolean>;
  isReordering: Accessor<boolean>;
  activateRow: (id: string) => void;
  beginRowReorder: (rowId: string, rowIndex: number, clientY: number) => void;
  completeRowReorder: () => void;
  clearActiveRow: () => void;
  clearSelection: () => void;
  hasFocusedCell: Accessor<boolean>;
  clearPendingRowOpenSuppression: () => void;
  clearFocus: () => void;
  getCellTabIndex: (rowId: string, columnIndex: number) => number;
  focusCell: (rowId: string, columnIndex: number) => void;
  registerCellElement: (
    rowId: string,
    columnIndex: number,
    element: HTMLElement | undefined,
  ) => void;
  handleCellKeyDown: (
    event: KeyboardEvent,
    rowId: string,
    columnIndex: number,
  ) => void;
  markRowOpenSuppressed: () => void;
  setReorderTargetIndex: (index: number | undefined) => void;
  setReorderDragging: (dragging: boolean) => void;
  setSelected?: (id: string, checked: boolean) => void;
  toggleAll?: (checked: boolean) => void;
  allSelected?: Accessor<boolean>;
  reorderState: {
    activeRowId: Accessor<string | undefined>;
    sourceIndex: Accessor<number | undefined>;
    targetIndex: Accessor<number | undefined>;
    pointerStartY: Accessor<number | undefined>;
  };
};

export function createDataGridInteraction<T extends { id: string }>(options: {
  rows: Accessor<T[]>;
  rowOpenMode: Accessor<DataGridRowOpenMode>;
  columnCount: Accessor<number>;
  reorder?: DataGridReorderConfig<T>;
  selection?: DataGridSelectionModel;
}) {
  const [activeRowId, setActiveRowId] = createSignal<string | undefined>();
  const [pendingRowOpenSuppression, setPendingRowOpenSuppression] =
    createSignal(false);
  const [focusedCell, setFocusedCell] = createSignal(
    getInitialFocusedCell(
      options.rows(),
      options.rowOpenMode(),
      options.columnCount(),
    ),
  );
  const [reorderActiveRowId, setReorderActiveRowId] = createSignal<
    string | undefined
  >();
  const [reorderSourceIndex, setReorderSourceIndex] = createSignal<
    number | undefined
  >();
  const [reorderTargetIndex, setReorderTargetIndex] = createSignal<
    number | undefined
  >();
  const [reorderPointerStartY, setReorderPointerStartY] = createSignal<
    number | undefined
  >();
  const [reordering, setReordering] = createSignal(false);
  const cellElements = new Map<string, HTMLElement>();

  const rowIds = createMemo(() => options.rows().map((row) => row.id));

  createEffect(() => {
    const currentActiveRowId = activeRowId();
    const currentFocusedCell = focusedCell();
    const currentRowIds = rowIds();

    if (
      currentActiveRowId !== undefined &&
      !currentRowIds.includes(currentActiveRowId)
    ) {
      setActiveRowId(undefined);
    }

    if (options.rowOpenMode() === "none" || options.rows().length === 0) {
      if (currentFocusedCell !== undefined) {
        setFocusedCell(undefined);
      }
      return;
    }

    if (currentFocusedCell === undefined) {
      setFocusedCell(
        getInitialFocusedCell(
          options.rows(),
          options.rowOpenMode(),
          options.columnCount(),
        ),
      );
      return;
    }

    const rowStillExists = rowIds().includes(currentFocusedCell.rowId);
    if (!rowStillExists) {
      setFocusedCell(
        getInitialFocusedCell(
          options.rows(),
          options.rowOpenMode(),
          options.columnCount(),
        ),
      );
      return;
    }

    if (currentFocusedCell.columnIndex >= options.columnCount()) {
      setFocusedCell({
        rowId: currentFocusedCell.rowId,
        columnIndex: Math.max(options.columnCount() - 1, 0),
      });
    }

    const reorderRowId = reorderActiveRowId();
    if (reorderRowId !== undefined && !currentRowIds.includes(reorderRowId)) {
      setReorderActiveRowId(undefined);
      setReorderSourceIndex(undefined);
      setReorderTargetIndex(undefined);
      setReorderPointerStartY(undefined);
      setReordering(false);
    }
  });

  function focusRegisteredCell(rowId: string, columnIndex: number) {
    cellElements.get(getCellKey(rowId, columnIndex))?.focus();
  }

  function isSelected(id: string) {
    return options.selection?.selectedIds().includes(id) ?? false;
  }

  return {
    isRowActive(id: string) {
      return activeRowId() === id;
    },
    isRowDragged(id: string) {
      return reorderActiveRowId() === id && reordering();
    },
    isRowDropTarget(id: string) {
      const targetIndex = reorderTargetIndex();
      if (targetIndex === undefined) {
        return false;
      }

      return options.rows()[targetIndex]?.id === id;
    },
    isRowFocused(id: string) {
      return focusedCell()?.rowId === id;
    },
    isSelected,
    selectedIds: () => options.selection?.selectedIds() ?? [],
    hasActiveRow: createMemo(() => activeRowId() !== undefined),
    hasPendingRowOpenSuppression: pendingRowOpenSuppression,
    hasReorder: createMemo(() => options.reorder !== undefined),
    isReordering: reordering,
    activateRow(id: string) {
      setActiveRowId(id);
    },
    beginRowReorder(rowId: string, rowIndex: number, clientY: number) {
      if (!options.reorder) {
        return;
      }

      setReorderActiveRowId(rowId);
      setReorderSourceIndex(rowIndex);
      setReorderTargetIndex(rowIndex);
      setReorderPointerStartY(clientY);
      setReordering(false);
      setPendingRowOpenSuppression(true);
    },
    completeRowReorder() {
      if (!options.reorder) {
        return;
      }

      const sourceIndex = reorderSourceIndex();
      const targetIndex = reorderTargetIndex();

      if (
        sourceIndex !== undefined &&
        targetIndex !== undefined &&
        sourceIndex !== targetIndex
      ) {
        const rows = options.rows();
        const row = rows[sourceIndex];

        if (row) {
          options.reorder.onReorder({
            fromIndex: sourceIndex,
            toIndex: targetIndex,
            row,
            rows,
          });
        }
      }

      setReorderActiveRowId(undefined);
      setReorderSourceIndex(undefined);
      setReorderTargetIndex(undefined);
      setReorderPointerStartY(undefined);
      setReordering(false);
    },
    clearActiveRow() {
      setActiveRowId(undefined);
    },
    clearSelection() {
      options.selection?.clear();
    },
    hasFocusedCell: createMemo(() => focusedCell() !== undefined),
    clearPendingRowOpenSuppression() {
      setPendingRowOpenSuppression(false);
    },
    clearFocus() {
      setFocusedCell(undefined);
    },
    getCellTabIndex(rowId: string, columnIndex: number) {
      if (options.rowOpenMode() === "none") {
        return -1;
      }

      const activeCell = focusedCell();
      if (!activeCell) {
        return rowIds()[0] === rowId && columnIndex === 0 ? 0 : -1;
      }

      return activeCell.rowId === rowId &&
        activeCell.columnIndex === columnIndex
        ? 0
        : -1;
    },
    focusCell(rowId: string, columnIndex: number) {
      if (options.rowOpenMode() === "none") {
        return;
      }

      setFocusedCell({ rowId, columnIndex });
    },
    registerCellElement(rowId: string, columnIndex: number, element) {
      const key = getCellKey(rowId, columnIndex);

      if (!element) {
        cellElements.delete(key);
        return;
      }

      cellElements.set(key, element);
    },
    handleCellKeyDown(event, rowId, columnIndex) {
      if (options.rowOpenMode() === "none") {
        return;
      }

      if (pendingRowOpenSuppression()) {
        event.preventDefault();
        return;
      }

      const rows = options.rows();
      const currentIndex = rows.findIndex((row) => row.id === rowId);
      const action = getVerticalNavigationAction(event.key, {
        currentIndex,
        itemCount: rows.length,
        includeHomeEnd: true,
      });

      if (!action || action.type !== "move") {
        return;
      }

      event.preventDefault();

      const nextRowId = rows[action.nextIndex]?.id;
      if (nextRowId === undefined) {
        return;
      }

      const nextCell = { rowId: nextRowId, columnIndex };
      setFocusedCell(nextCell);
      focusRegisteredCell(nextCell.rowId, nextCell.columnIndex);
    },
    markRowOpenSuppressed() {
      setPendingRowOpenSuppression(true);
    },
    setReorderTargetIndex(index: number | undefined) {
      setReorderTargetIndex(index);
    },
    setReorderDragging(dragging: boolean) {
      setReordering(dragging);
    },
    setSelected: options.selection?.setSelected,
    toggleAll: options.selection?.toggleAll,
    allSelected: options.selection?.allSelected,
    reorderState: {
      activeRowId: reorderActiveRowId,
      sourceIndex: reorderSourceIndex,
      targetIndex: reorderTargetIndex,
      pointerStartY: reorderPointerStartY,
    },
  } satisfies DataGridInteractionModel;
}

function getInitialFocusedCell(
  rows: Array<{ id: string }>,
  rowOpenMode: DataGridRowOpenMode,
  columnCount: number,
): { rowId: string; columnIndex: number } | undefined {
  if (rowOpenMode === "none" || rows.length === 0 || columnCount === 0) {
    return undefined;
  }

  return {
    rowId: rows[0].id,
    columnIndex: 0,
  };
}

function getCellKey(rowId: string, columnIndex: number) {
  return `${rowId}:${columnIndex}`;
}
