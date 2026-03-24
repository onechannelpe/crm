import type { SidePanelPageType } from "../types/side-panel-page";

type SidePanelPageMetadata = {
  showsSearch: boolean;
};

export const SIDE_PANEL_PAGE_METADATA = {
  root: {
    showsSearch: true,
  },
  "search-results": {
    showsSearch: true,
  },
  record: {
    showsSearch: false,
  },
} satisfies Record<SidePanelPageType, SidePanelPageMetadata>;
