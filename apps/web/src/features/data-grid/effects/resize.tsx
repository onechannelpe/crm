import { onCleanup, onMount } from "solid-js";

import { useDataGridInstance } from "../context/instance-context";

export function DataGridResizeEffect() {
  const interaction = useDataGridInstance();

  onMount(() => {
    function handlePointerMove(event: PointerEvent) {
      interaction.updateColumnResize(event.clientX);
    }

    function handlePointerUp() {
      interaction.endColumnResize();
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    onCleanup(() => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    });
  });

  return null;
}
