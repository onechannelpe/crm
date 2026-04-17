import { DataGridDragSelectEffect } from "./drag-select";
import { DataGridFocusClickOutsideEffect } from "./focus-click-outside";
import { DataGridReorderEffect } from "./reorder";
import { DataGridSelectionEffects } from "./selection";
import type { DataGridRowId } from "../model/types";

export function DataGridBodyEffects(props: {
  rows: Array<{ id: DataGridRowId }>;
}) {
  return (
    <>
      <DataGridDragSelectEffect />
      <DataGridReorderEffect />
      <DataGridSelectionEffects rows={props.rows} />
      <DataGridFocusClickOutsideEffect />
    </>
  );
}
