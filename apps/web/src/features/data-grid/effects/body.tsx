import { DataGridFocusClickOutsideEffect } from "./focus-click-outside";
import { DataGridSelectionEffects } from "./selection";

export function DataGridBodyEffects<T extends { id: number }>(props: {
  rows: T[];
}) {
  return (
    <>
      <DataGridSelectionEffects rows={props.rows} />
      <DataGridFocusClickOutsideEffect />
    </>
  );
}
