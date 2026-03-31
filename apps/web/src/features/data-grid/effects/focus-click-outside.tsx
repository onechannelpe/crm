import { onCleanup, onMount } from "solid-js";

import { useDataGridInstance } from "../context/instance-context";
import { useDataGridTable } from "../context/table-context";

export function DataGridFocusClickOutsideEffect() {
  const interaction = useDataGridInstance();
  const table = useDataGridTable();

  const handlePointerDown = (event: PointerEvent) => {
    const container = table.getContainer();
    const target = event.target;

    if (
      (!interaction.hasFocusedCell() && !interaction.hasActiveRow()) ||
      !container ||
      !(target instanceof Node) ||
      container.contains(target)
    ) {
      return;
    }

    interaction.clearFocus();
    interaction.clearActiveRow();
  };

  onMount(() => {
    document.addEventListener("pointerdown", handlePointerDown);
    onCleanup(() =>
      document.removeEventListener("pointerdown", handlePointerDown),
    );
  });

  return null;
}
