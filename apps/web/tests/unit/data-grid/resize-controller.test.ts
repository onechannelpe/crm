import { createRoot } from "solid-js";
import { describe, expect, it } from "vitest";

import { createDataGridResizeController } from "~/features/data-grid/hooks/create-resize-controller";

describe("createDataGridResizeController", () => {
  it("updates only from the pointer that started the resize", () => {
    createRoot((dispose) => {
      const resize = createDataGridResizeController();
      resize.begin({
        key: "name",
        pointerId: 3,
        clientX: 100,
        currentWidth: 180,
      });

      resize.update(4, 140);
      expect(resize.columnWidths()).toEqual({});

      resize.update(3, 140);
      expect(resize.columnWidths()).toEqual({ name: 220 });

      resize.complete(4);
      expect(resize.active()).toBe(true);

      resize.complete(3);
      expect(resize.active()).toBe(false);
      dispose();
    });
  });

  it("enforces the minimum column width", () => {
    createRoot((dispose) => {
      const resize = createDataGridResizeController();
      resize.begin({
        key: "name",
        pointerId: 3,
        clientX: 200,
        currentWidth: 120,
      });

      resize.update(3, 0);
      expect(resize.columnWidths()).toEqual({ name: 80 });
      dispose();
    });
  });
});
