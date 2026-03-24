import type { Accessor } from "solid-js";
import { createMemo } from "solid-js";
import type { SidePanelPage } from "../state/side-panel-store";
import { useSidePanel } from "../state/use-side-panel";

export type SidePanelContextChip = {
  page: SidePanelPage;
  onClick?: () => void;
};

export function useSidePanelContextChips(): Accessor<SidePanelContextChip[]> {
  const { navigationStack, navigateToStackIndex } = useSidePanel();

  return createMemo(() => {
    const nonRootEntries = navigationStack()
      .map((page, i) => ({ page, originalIndex: i }))
      .filter(({ page }) => page.key !== "root");

    return nonRootEntries.map(({ page, originalIndex }, chipIndex) => {
      const isLast = chipIndex === nonRootEntries.length - 1;
      return {
        page,
        onClick: isLast ? undefined : () => navigateToStackIndex(originalIndex),
      };
    });
  });
}
