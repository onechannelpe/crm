import type {
  SidePanelNavigationEntry,
  SidePanelPageState,
} from "./side-panel-page";

export type SidePanelState = {
  isOpen: boolean;
  isClosing: boolean;
  stack: SidePanelNavigationEntry[];
  pageStateById: Record<string, SidePanelPageState>;
  searchText: string;
  panelWidth: number;
};
