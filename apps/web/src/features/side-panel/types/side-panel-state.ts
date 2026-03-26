import type {
  SidePanelNavigationEntry,
  SidePanelPageState,
} from "./side-panel-page";

export type SidePanelState = {
  isOpen: boolean;
  isClosing: boolean;
  navigationStack: SidePanelNavigationEntry[];
  pageStateById: Record<string, SidePanelPageState>;
  searchText: string;
  panelWidth: number;
};
