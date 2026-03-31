import {
  createEffect,
  createMemo,
  createSignal,
  type Accessor,
} from "solid-js";

import { getVerticalNavigationAction } from "~/lib/keyboard/list-navigation";

import type { DataGridRowOpenMode } from "../model/row-open";
import type { DataGridSelectionModel } from "./use-selection";

type FocusedCell = {
  rowId: number;
  columnIndex: number;
};

export type DataGridInteractionModel = {
  isRowActive: (id: number) => boolean;
  isRowFocused: (id: number) => boolean;
  isSelected: (id: number) => boolean;
  selectedIds: Accessor<number[]>;
  hasActiveRow: Accessor<boolean>;
  activateRow: (id: number) => void;
  clearActiveRow: () => void;
  clearSelection: () => void;
  hasFocusedCell: Accessor<boolean>;
  clearFocus: () => void;
  getCellTabIndex: (rowId: number, columnIndex: number) => number;
  focusCell: (rowId: number, columnIndex: number) => void;
  registerCellElement: (
    rowId: number,
    columnIndex: number,
    element: HTMLButtonElement | undefined,
  ) => void;
  handleCellKeyDown: (
    event: KeyboardEvent,
    rowId: number,
    columnIndex: number,
  ) => void;
  setSelected?: (id: number, checked: boolean) => void;
  beginSelectionDrag?: (id: number) => void;
  updateSelectionDrag?: (id: number) => void;
  toggleAll?: (checked: boolean) => void;
  allSelected?: Accessor<boolean>;
};

export function createDataGridInteraction<T extends { id: number }>(options: {
  rows: Accessor<T[]>;
  rowOpenMode: Accessor<DataGridRowOpenMode>;
  columnCount: Accessor<number>;
  selection?: DataGridSelectionModel;
}) {
  const [activeRowId, setActiveRowId] = createSignal<number | undefined>();
  const [focusedCell, setFocusedCell] = createSignal<FocusedCell | undefined>(
    getInitialFocusedCell(
      options.rows(),
      options.rowOpenMode(),
      options.columnCount(),
    ),
  );
  const cellElements = new Map<string, HTMLButtonElement>();

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
  });

  function focusRegisteredCell(rowId: number, columnIndex: number) {
    cellElements.get(getCellKey(rowId, columnIndex))?.focus();
  }

  function isSelected(id: number) {
    return options.selection?.selectedIds().includes(id) ?? false;
  }

  return {
    isRowActive(id: number) {
      return activeRowId() === id;
    },
    isRowFocused(id: number) {
      return focusedCell()?.rowId === id;
    },
    isSelected,
    selectedIds: () => options.selection?.selectedIds() ?? [],
    hasActiveRow: createMemo(() => activeRowId() !== undefined),
    activateRow(id: number) {
      setActiveRowId(id);
    },
    clearActiveRow() {
      setActiveRowId(undefined);
    },
    clearSelection() {
      options.selection?.clear();
    },
    hasFocusedCell: createMemo(() => focusedCell() !== undefined),
    clearFocus() {
      setFocusedCell(undefined);
    },
    getCellTabIndex(rowId: number, columnIndex: number) {
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
    focusCell(rowId: number, columnIndex: number) {
      if (options.rowOpenMode() === "none") {
        return;
      }

      setFocusedCell({ rowId, columnIndex });
    },
    registerCellElement(rowId: number, columnIndex: number, element) {
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
    setSelected: options.selection?.setSelected,
    beginSelectionDrag: options.selection?.beginSelectionDrag,
    updateSelectionDrag: options.selection?.updateSelectionDrag,
    toggleAll: options.selection?.toggleAll,
    allSelected: options.selection?.allSelected,
  } satisfies DataGridInteractionModel;
}

function getInitialFocusedCell(
  rows: Array<{ id: number }>,
  rowOpenMode: DataGridRowOpenMode,
  columnCount: number,
) {
  if (rowOpenMode === "none" || rows.length === 0 || columnCount === 0) {
    return undefined;
  }

  return {
    rowId: rows[0].id,
    columnIndex: 0,
  };
}

function getCellKey(rowId: number, columnIndex: number) {
  return `${rowId}:${columnIndex}`;
}
