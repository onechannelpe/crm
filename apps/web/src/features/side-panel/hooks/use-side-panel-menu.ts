import { useSidePanel } from "../state/use-side-panel";
import {
  createRootSidePanelPage,
  createSearchRecordsSidePanelPage,
} from "../types/side-panel-page";

export function useSidePanelMenu() {
  const { isOpen, openPanel, closePanel } = useSidePanel();

  // Always open a fresh page so repeated entry points reset the panel stack.
  const openSidePanelMenu = () => openPanel(createRootSidePanelPage());

  const openSearchRecordsPage = () =>
    openPanel(createSearchRecordsSidePanelPage());

  const toggleSidePanelMenu = () => {
    if (isOpen()) {
      closePanel();
      return;
    }

    openSidePanelMenu();
  };

  return {
    isSidePanelOpen: isOpen,
    openSidePanelMenu,
    openSearchRecordsPage,
    toggleSidePanelMenu,
    closeSidePanelMenu: closePanel,
  };
}
