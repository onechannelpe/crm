import { createMemo, Show } from "solid-js";

import { useDataGrid } from "../context/instance-context";
import type { DataGridColumn } from "../model/types";
import { DataGridCellEditor } from "./cell-editor";

export function DataGridEditorLayer<T>(props: {
  columns: ReadonlyArray<DataGridColumn<T>>;
  rowId: (row: T) => string;
  rows: ReadonlyArray<T>;
}) {
  const { focus } = useDataGrid();
  const activeEditor = createMemo(() => {
    const cell = focus.editingCell();
    if (!cell) {
      return undefined;
    }

    const row = props.rows.find(
      (candidate) => props.rowId(candidate) === cell.rowId,
    );
    const edit = props.columns.find(
      (column) => column.key === cell.columnKey,
    )?.edit;
    return row && edit ? { cell, edit, row } : undefined;
  });

  return (
    <Show when={activeEditor()}>
      {(editor) => (
        <DataGridCellEditor
          anchor={() => editor().cell.anchor}
          ariaLabel={editor().edit.ariaLabel}
          onClose={focus.closeEditor}
        >
          {editor().edit.renderEditor(editor().row, focus.closeEditor)}
        </DataGridCellEditor>
      )}
    </Show>
  );
}
