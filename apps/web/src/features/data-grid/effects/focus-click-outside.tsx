import { onCleanup, onMount } from "solid-js";

import { useDataGrid } from "../context/instance-context";

export function DataGridFocusClickOutsideEffect() {
  const grid = useDataGrid();
  const focus = grid.focus;

  const handlePointerDown = (event: PointerEvent) => {
    const container = grid.getContainer();
    const target = event.target;

    if (
      (!focus.hasFocusedCell() && !focus.hasActiveRow()) ||
      !container ||
      !(target instanceof Node) ||
      container.contains(target)
    ) {
      return;
    }

    focus.clearFocus();
    focus.clearActiveRow();
  };

  onMount(() => {
    document.addEventListener("pointerdown", handlePointerDown);
    onCleanup(() =>
      document.removeEventListener("pointerdown", handlePointerDown),
    );
  });

  return null;
}
