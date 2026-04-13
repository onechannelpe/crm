import { createEffect } from "solid-js";

import { useHotkey } from "~/lib/hotkey/use-hotkey";

import { useDataGridInstance } from "../context/instance-context";
import { useDataGridTable } from "../context/table-context";

export function DataGridSelectionEffects(props: {
  rows: Array<{ id: number }>;
}) {
  const interaction = useDataGridInstance();
  const table = useDataGridTable();

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
    "Mod+A",
    () => {
      interaction.toggleAll?.(true);
    },
    {
      enabled: () =>
        !table.suspendEscapeSelectionClear &&
        interaction.toggleAll !== undefined &&
        isGridInteractionActive(table.getContainer),
    },
  );

  useHotkey(
    "Escape",
    () => {
      interaction.clearSelection();
    },
    {
      enabled: () =>
        !table.suspendEscapeSelectionClear &&
        isGridInteractionActive(table.getContainer) &&
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
