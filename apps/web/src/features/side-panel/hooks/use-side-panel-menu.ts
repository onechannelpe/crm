import { useSidePanel } from "../state/use-side-panel";
import {
  createRootSidePanelPage,
  createSearchRecordsSidePanelPage,
} from "../types/side-panel-page";

/*
  One owner for every way into the command menu: the drawer button, the mobile
  bar, the page header button and the hotkeys. Each entry point lands on a fresh
  page instead of reusing whatever the panel last showed, so pressing search
  while the panel is already open still resets the stack and hands the caret
  back to the top bar input.
*/
export function useSidePanelMenu() {
  const { isOpen, openPanel, closePanel } = useSidePanel();

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
