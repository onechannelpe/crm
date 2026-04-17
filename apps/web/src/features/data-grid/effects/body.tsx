import type { DataGridRowId } from "../model/types";
import { DataGridDragSelectEffect } from "./drag-select";
import { DataGridFocusClickOutsideEffect } from "./focus-click-outside";
import { DataGridReorderEffect } from "./reorder";
import { DataGridSelectionEffects } from "./selection";

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
