import { createMemo, createSignal, type Accessor } from "solid-js";

import type { DataGridReorderConfig } from "../dnd/types";
import type { DataGridSelectionController } from "../model/selection";
import type { DataGridColumn } from "../model/types";
import {
  createDataGridFocusController,
  type DataGridFocusController,
} from "./create-focus-controller";
import {
  createDataGridReorderController,
  type DataGridReorderController,
} from "./create-reorder-controller";
import {
  createDataGridResizeController,
  type DataGridResizeController,
} from "./create-resize-controller";
import {
  createDataGridRowActivationController,
  type DataGridRowActivationController,
} from "./create-row-activation-controller";

export type DataGridController = {
  getContainer: Accessor<HTMLElement | undefined>;
  getScrollWrapper: Accessor<HTMLElement | undefined>;
  setContainer: (element: HTMLElement) => void;
  setScrollWrapper: (element: HTMLElement) => void;
  isInteractive: Accessor<boolean>;
  focus: DataGridFocusController;
  resize: DataGridResizeController;
  activation: DataGridRowActivationController;
  selection?: DataGridSelectionController;
  reorder?: DataGridReorderController;
};

export function createDataGridController<T extends { id: string }>(options: {
  rows: Accessor<ReadonlyArray<T>>;
  columns: Accessor<ReadonlyArray<DataGridColumn<T>>>;
  selection?: DataGridSelectionController;
  reorder?: DataGridReorderConfig<T>;
  isInteractive: Accessor<boolean>;
}): DataGridController {
  const [container, setContainer] = createSignal<HTMLElement>();
  const [scrollWrapper, setScrollWrapper] = createSignal<HTMLElement>();
  const rowIds = createMemo(() => options.rows().map((row) => row.id));
  const columnKeys = createMemo(() =>
    options.columns().map((column) => column.key),
  );

  return {
    getContainer: container,
    getScrollWrapper: scrollWrapper,
    setContainer,
    setScrollWrapper,
    isInteractive: options.isInteractive,
    focus: createDataGridFocusController({
      rowIds,
      columnKeys,
      getContainer: container,
    }),
    resize: createDataGridResizeController(),
    activation: createDataGridRowActivationController(),
    selection: options.selection,
    reorder: options.reorder
      ? createDataGridReorderController(options.rows, options.reorder)
      : undefined,
  };
}
