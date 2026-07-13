import { createEffect, onCleanup } from "solid-js";

import { useDataGrid } from "../context/instance-context";

export function DataGridResizeEffect() {
  const { resize } = useDataGrid();

  createEffect(() => {
    if (!resize.active()) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) =>
      resize.update(event.pointerId, event.clientX);
    const handlePointerUp = (event: PointerEvent) =>
      resize.complete(event.pointerId);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    window.addEventListener("pointercancel", handlePointerUp);
    onCleanup(() => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
    });
  });

  return null;
}
