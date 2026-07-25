import { useHotkey } from "~/browser/hotkey/use-hotkey";

import { useDataGrid } from "../context/instance-context";
import type { DataGridSelectionController } from "../model/selection";

export function DataGridSelectionHotkeys(props: {
  selection: DataGridSelectionController;
}) {
  const grid = useDataGrid();
  const selection = props.selection;

  useHotkey(
    "Mod+A",
    () => {
      selection.toggleAll(true);
    },
    {
      enabled: () => isGridInteractionActive(grid.getContainer),
    },
  );

  useHotkey(
    "Escape",
    () => {
      selection.clear();
    },
    {
      enabled: () =>
        isGridInteractionActive(grid.getContainer) &&
        selection.selectedIds().size > 0,
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
