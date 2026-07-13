import { createMemo, Show } from "solid-js";

import { useDataGrid } from "../context/instance-context";
import type { DataGridColumn } from "../model/types";
import { DataGridCellEditor } from "./cell-editor";

export function DataGridEditorLayer<T extends { id: string }>(props: {
  columns: ReadonlyArray<DataGridColumn<T>>;
  rows: ReadonlyArray<T>;
}) {
  const { focus } = useDataGrid();
  const activeEditor = createMemo(() => {
    const cell = focus.editingCell();
    if (!cell) {
      return undefined;
    }

    const row = props.rows.find((candidate) => candidate.id === cell.rowId);
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
          {editor().edit.renderEditor({
            row: editor().row,
            close: focus.closeEditor,
          })}
        </DataGridCellEditor>
      )}
    </Show>
  );
}
