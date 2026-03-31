import { createPanelRowOpen } from "~/features/data-grid/model/row-open";
import type { DataGridRowOpen } from "~/features/data-grid/model/row-open";

import { useSidePanel } from "../state/use-side-panel";
import type { SidePanelPageDefinition } from "../types/side-panel-page";

export function useSidePanelRowOpen<T>(
  buildPage: (row: T) => SidePanelPageDefinition,
): DataGridRowOpen<T> {
  const { closePanel, currentEntry, isClosing, isOpen, openPanel } =
    useSidePanel();

  return createPanelRowOpen((row) => {
    const page = buildPage(row);
    const activeEntry = currentEntry();

    if (
      activeEntry &&
      activeEntry.page === page.entry.page &&
      activeEntry.pageId === page.entry.pageId &&
      (isOpen() || isClosing())
    ) {
      closePanel();
      return;
    }

    openPanel(page);
  });
}
