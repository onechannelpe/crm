import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";

import { createDataGridInteraction } from "~/features/data-grid/hooks/use-instance";

type Row = { id: string };

function setup(rows: Row[]) {
  return createRoot((dispose) => {
    const [getRows, setRows] = createSignal<Row[]>(rows);
    const interaction = createDataGridInteraction<Row>({
      rows: getRows,
      rowOpenMode: () => "panel",
      columnCount: () => 3,
    });
    return { interaction, setRows, dispose };
  });
}

describe("createDataGridInteraction edit state", () => {
  it("opens an editor for exactly one cell and closes it", () => {
    const { interaction, dispose } = setup([{ id: "a" }, { id: "b" }]);

    expect(interaction.hasEditingCell()).toBe(false);

    interaction.openCellEditor("b", 2);

    expect(interaction.isCellEditing("b", 2)).toBe(true);
    expect(interaction.isCellEditing("a", 2)).toBe(false);
    expect(interaction.isCellEditing("b", 1)).toBe(false);
    expect(interaction.hasEditingCell()).toBe(true);

    interaction.closeCellEditor();

    expect(interaction.hasEditingCell()).toBe(false);
    expect(interaction.isCellEditing("b", 2)).toBe(false);

    dispose();
  });

  it("focuses the cell it opens an editor on", () => {
    const { interaction, dispose } = setup([{ id: "a" }, { id: "b" }]);

    interaction.openCellEditor("b", 1);

    expect(interaction.getCellTabIndex("b", 1)).toBe(0);
    expect(interaction.getCellTabIndex("a", 0)).toBe(-1);

    dispose();
  });
});
