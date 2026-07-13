import { createRoot } from "solid-js";
import { describe, expect, it, vi } from "vitest";

import type { DataGridReorderEvent } from "~/features/data-grid/dnd/types";
import { createDataGridReorderController } from "~/features/data-grid/hooks/create-reorder-controller";

type Row = { id: string };

describe("createDataGridReorderController", () => {
  it("emits one explicit reorder event and resets drag state", () => {
    createRoot((dispose) => {
      const rows = [{ id: "lead-1" }, { id: "lead-2" }] as const;
      const onReorder = vi.fn<(event: DataGridReorderEvent<Row>) => void>();
      const reorder = createDataGridReorderController(() => rows, {
        onReorder,
      });

      reorder.begin({
        rowId: "lead-1",
        rowIndex: 0,
        pointerId: 2,
        clientY: 120,
      });
      reorder.setDragging(true);
      reorder.setTargetIndex(1);
      reorder.complete();

      expect(onReorder).toHaveBeenCalledOnce();
      expect(onReorder).toHaveBeenCalledWith({
        fromIndex: 0,
        toIndex: 1,
        row: rows[0],
        rows,
      });
      expect(reorder.activeRowId()).toBeUndefined();
      expect(reorder.pointerId()).toBeUndefined();
      expect(reorder.dragging()).toBe(false);

      dispose();
    });
  });

  it("does not emit when the row stays in place", () => {
    createRoot((dispose) => {
      const rows = [{ id: "lead-1" }] as const;
      const onReorder = vi.fn<(event: DataGridReorderEvent<Row>) => void>();
      const reorder = createDataGridReorderController(() => rows, {
        onReorder,
      });

      reorder.begin({
        rowId: "lead-1",
        rowIndex: 0,
        pointerId: 2,
        clientY: 120,
      });
      reorder.complete();

      expect(onReorder).not.toHaveBeenCalled();
      dispose();
    });
  });
});
