import type {
  SidePanelPageDefinition,
} from "./side-panel-page";

export type SidePanelState = {
  isOpen: boolean;
  isClosing: boolean;
  stack: SidePanelPageDefinition[];
  searchText: string;
  panelWidth: number;
};
