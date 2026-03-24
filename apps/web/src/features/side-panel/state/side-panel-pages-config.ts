import type { Component } from "solid-js";

import { SidePanelRootPage } from "../pages/root/side-panel-root-page";
import { SidePanelSearchCompanyPage } from "../pages/search-company/side-panel-search-company-page";
import { SidePanelSearchCompanyPageInfo } from "../pages/search-company/side-panel-search-company-page-info";
import { SidePanelSearchPersonPage } from "../pages/search-person/side-panel-search-person-page";
import { SidePanelSearchPersonPageInfo } from "../pages/search-person/side-panel-search-person-page-info";
import type { SidePanelPageKey } from "../types/side-panel-page";

type SidePanelPageConfig = {
  showsSearch: boolean;
  component: Component;
  pageInfoComponent?: Component;
};

export const SIDE_PANEL_PAGES_CONFIG = {
  root: {
    showsSearch: true,
    component: SidePanelRootPage,
    pageInfoComponent: undefined,
  },
  "search-person-detail": {
    showsSearch: false,
    component: SidePanelSearchPersonPage,
    pageInfoComponent: SidePanelSearchPersonPageInfo,
  },
  "search-company-detail": {
    showsSearch: false,
    component: SidePanelSearchCompanyPage,
    pageInfoComponent: SidePanelSearchCompanyPageInfo,
  },
} satisfies Record<SidePanelPageKey, SidePanelPageConfig>;
