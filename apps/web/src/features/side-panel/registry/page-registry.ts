import type { Component } from "solid-js";

import { DataGridDetailPage } from "../pages/data-grid-detail/page";
import { DataGridDetailPageInfo } from "../pages/data-grid-detail/page-info";
import { InventoryDetailPage } from "../pages/inventory-detail/page";
import { InventoryDetailPageInfo } from "../pages/inventory-detail/page-info";
import { LeadCreatePage } from "../pages/lead-create/page";
import { LeadCreatePageInfo } from "../pages/lead-create/page-info";
import { LeadDetailPage } from "../pages/lead-detail/page";
import { LeadDetailPageInfo } from "../pages/lead-detail/page-info";
import { RootPage } from "../pages/root/page";
import { SearchCompanyPage } from "../pages/search-company/page";
import { SearchCompanyPageInfo } from "../pages/search-company/page-info";
import { SearchPersonPage } from "../pages/search-person/page";
import { SearchPersonPageInfo } from "../pages/search-person/page-info";
import type { SidePanelPageKey } from "../types/side-panel-page";

type SidePanelPageConfig = {
  showsSearch: boolean;
  component: Component;
  pageInfoComponent?: Component;
  topBarActionsComponent?: Component;
};

export const SIDE_PANEL_PAGES_CONFIG = {
  root: {
    showsSearch: true,
    component: RootPage,
    pageInfoComponent: undefined,
    topBarActionsComponent: undefined,
  },
  "search-person-detail": {
    showsSearch: false,
    component: SearchPersonPage,
    pageInfoComponent: SearchPersonPageInfo,
    topBarActionsComponent: undefined,
  },
  "search-company-detail": {
    showsSearch: false,
    component: SearchCompanyPage,
    pageInfoComponent: SearchCompanyPageInfo,
    topBarActionsComponent: undefined,
  },
  "lead-create": {
    showsSearch: false,
    component: LeadCreatePage,
    pageInfoComponent: LeadCreatePageInfo,
    topBarActionsComponent: undefined,
  },
  "lead-detail": {
    showsSearch: false,
    component: LeadDetailPage,
    pageInfoComponent: LeadDetailPageInfo,
    topBarActionsComponent: undefined,
  },
  "inventory-detail": {
    showsSearch: false,
    component: InventoryDetailPage,
    pageInfoComponent: InventoryDetailPageInfo,
    topBarActionsComponent: undefined,
  },
  "data-grid-detail": {
    showsSearch: false,
    component: DataGridDetailPage,
    pageInfoComponent: DataGridDetailPageInfo,
    topBarActionsComponent: undefined,
  },
} satisfies Record<SidePanelPageKey, SidePanelPageConfig>;
