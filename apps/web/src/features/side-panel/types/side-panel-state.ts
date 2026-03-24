import type { SidePanelPage } from "./side-panel-page";

export type SidePanelState = {
  isOpen: boolean;
  isClosing: boolean;
  navigationStack: SidePanelPage[];
  searchText: string;
  panelWidth: number;
};
