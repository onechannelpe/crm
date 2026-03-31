import { onCleanup, onMount } from "solid-js";

import { useDataGridInstance } from "../context/instance-context";

export function DataGridFocusClickOutsideEffect(props: {
  getContainer: () => HTMLElement | undefined;
}) {
  const interaction = useDataGridInstance();

  const handlePointerDown = (event: PointerEvent) => {
    const container = props.getContainer();
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
