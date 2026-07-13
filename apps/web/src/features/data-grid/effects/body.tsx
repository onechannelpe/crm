import { Show } from "solid-js";

import { useDataGrid } from "../context/instance-context";
import { DataGridDragSelectEffect } from "./drag-select";
import { DataGridFocusClickOutsideEffect } from "./focus-click-outside";
import { DataGridReorderEffect } from "./reorder";
import { DataGridResizeEffect } from "./resize";
import { DataGridSelectionHotkeys } from "./selection-hotkeys";

export function DataGridBodyEffects() {
  const grid = useDataGrid();

  return (
    <>
      <DataGridResizeEffect />
      <DataGridFocusClickOutsideEffect />
      <Show when={grid.selection}>
        {(selection) => (
          <>
            <DataGridDragSelectEffect selection={selection()} />
            <DataGridSelectionHotkeys selection={selection()} />
          </>
        )}
      </Show>
      <Show when={grid.reorder}>
        {(reorder) => <DataGridReorderEffect reorder={reorder()} />}
      </Show>
    </>
  );
}
