import { createPanelRowOpen, type DataGridRowOpen } from "~/features/data-grid";

import { useSidePanel } from "../state/use-side-panel";
import type { SidePanelPageDefinition } from "../types/side-panel-page";

export function useSidePanelRowOpen<T>(
  buildPage: (row: T) => SidePanelPageDefinition,
): DataGridRowOpen<T> {
  const { openPanel } = useSidePanel();

  return createPanelRowOpen((row) => {
    openPanel(buildPage(row));
  });
}
