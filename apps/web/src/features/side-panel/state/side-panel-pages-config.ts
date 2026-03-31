import type { Component } from "solid-js";

import { SidePanelDataGridDetailPage } from "../pages/data-grid-detail/side-panel-data-grid-detail-page";
import { SidePanelDataGridDetailPageInfo } from "../pages/data-grid-detail/side-panel-data-grid-detail-page-info";
import { SidePanelInventoryDetailPage } from "../pages/inventory-detail/side-panel-inventory-detail-page";
import { SidePanelInventoryDetailPageInfo } from "../pages/inventory-detail/side-panel-inventory-detail-page-info";
import { SidePanelLeadCreatePage } from "../pages/lead-create/side-panel-lead-create-page";
import { SidePanelLeadDetailPage } from "../pages/lead-detail/side-panel-lead-detail-page";
import { SidePanelLeadDetailPageInfo } from "../pages/lead-detail/side-panel-lead-detail-page-info";
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
  "lead-create": {
    showsSearch: false,
    component: SidePanelLeadCreatePage,
    pageInfoComponent: undefined,
  },
  "lead-detail": {
    showsSearch: false,
    component: SidePanelLeadDetailPage,
    pageInfoComponent: SidePanelLeadDetailPageInfo,
  },
  "inventory-detail": {
    showsSearch: false,
    component: SidePanelInventoryDetailPage,
    pageInfoComponent: SidePanelInventoryDetailPageInfo,
  },
  "data-grid-detail": {
    showsSearch: false,
    component: SidePanelDataGridDetailPage,
    pageInfoComponent: SidePanelDataGridDetailPageInfo,
  },
} satisfies Record<SidePanelPageKey, SidePanelPageConfig>;
