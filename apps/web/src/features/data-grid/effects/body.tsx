import { DataGridDragSelectEffect } from "./drag-select";
import { DataGridFocusClickOutsideEffect } from "./focus-click-outside";
import { DataGridReorderEffect } from "./reorder";
import { DataGridSelectionEffects } from "./selection";

export function DataGridBodyEffects(props: { rows: Array<{ id: string }> }) {
  return (
    <>
      <DataGridDragSelectEffect />
      <DataGridReorderEffect />
      <DataGridSelectionEffects rows={props.rows} />
      <DataGridFocusClickOutsideEffect />
    </>
  );
}
