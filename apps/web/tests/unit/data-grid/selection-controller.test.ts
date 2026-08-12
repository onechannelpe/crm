import { createRoot, createSignal } from "solid-js";
import { describe, expect, it } from "vitest";

import { createDataGridSelection } from "~/features/data-grid/hooks/create-selection";

describe("createDataGridSelection", () => {
  it("keeps selection limited to rows owned by the grid", () => {
    createRoot((dispose) => {
      const [rows] = createSignal([{ id: "lead-1" }, { id: "lead-2" }]);
      const selection = createDataGridSelection(rows, (row) => row.id);

      selection.replace(["lead-1", "missing"]);

      expect([...selection.selectedIds()]).toEqual(["lead-1"]);
      expect(selection.someSelected()).toBe(true);
      expect(selection.allSelected()).toBe(false);

      selection.setSelected("missing", true);
      expect([...selection.selectedIds()]).toEqual(["lead-1"]);

      dispose();
    });
  });

  it("selects and clears the current rows as one update", () => {
    createRoot((dispose) => {
      const [rows] = createSignal([{ id: "lead-1" }, { id: "lead-2" }]);
      const selection = createDataGridSelection(rows, (row) => row.id);

      selection.toggleAll(true);
      expect([...selection.selectedIds()]).toEqual(["lead-1", "lead-2"]);
      expect(selection.allSelected()).toBe(true);

      selection.clear();
      expect(selection.selectedIds().size).toBe(0);
      expect(selection.someSelected()).toBe(false);

      dispose();
    });
  });
});
