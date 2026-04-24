import { DataGridDragSelectEffect } from "./drag-select";
import { DataGridFocusClickOutsideEffect } from "./focus-click-outside";
import { DataGridReorderEffect } from "./reorder";
import { DataGridResizeEffect } from "./resize";
import { DataGridSelectionEffects } from "./selection";

export function DataGridBodyEffects(props: { rows: Array<{ id: string }> }) {
  return (
    <>
      <DataGridDragSelectEffect />
      <DataGridResizeEffect />
      <DataGridReorderEffect />
      <DataGridSelectionEffects rows={props.rows} />
      <DataGridFocusClickOutsideEffect />
    </>
  );
}
