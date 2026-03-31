import { createEffect } from "solid-js";

import { useHotkey } from "~/lib/hotkey/use-hotkey";

import { useDataGridInstance } from "../context/instance-context";

export function DataGridSelectionEffects<T extends { id: number }>(props: {
  getContainer: () => HTMLElement | undefined;
  rows: T[];
  suspendEscapeSelectionClear?: boolean;
}) {
  const interaction = useDataGridInstance();

  createEffect(() => {
    const visibleRowIds = new Set(props.rows.map((row) => row.id));
    const hasStaleSelection = interaction
      .selectedIds()
      .some((selectedId) => !visibleRowIds.has(selectedId));

    if (hasStaleSelection) {
      interaction.clearSelection();
    }
  });

  useHotkey(
    "Escape",
    () => {
      interaction.clearSelection();
    },
    {
      enabled: () =>
        !props.suspendEscapeSelectionClear &&
        isGridInteractionActive(props.getContainer) &&
        interaction.selectedIds().length > 0,
    },
  );

  return null;
}

function isGridInteractionActive(getContainer: () => HTMLElement | undefined) {
  const container = getContainer();
  const activeElement = document.activeElement;

  return (
    !!container &&
    activeElement instanceof Node &&
    container.contains(activeElement)
  );
}
