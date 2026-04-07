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
};

export const SIDE_PANEL_PAGES_CONFIG = {
  root: {
    showsSearch: true,
    component: RootPage,
    pageInfoComponent: undefined,
  },
  "search-person-detail": {
    showsSearch: false,
    component: SearchPersonPage,
    pageInfoComponent: SearchPersonPageInfo,
  },
  "search-company-detail": {
    showsSearch: false,
    component: SearchCompanyPage,
    pageInfoComponent: SearchCompanyPageInfo,
  },
  "lead-create": {
    showsSearch: false,
    component: LeadCreatePage,
    pageInfoComponent: LeadCreatePageInfo,
  },
  "lead-detail": {
    showsSearch: false,
    component: LeadDetailPage,
    pageInfoComponent: LeadDetailPageInfo,
  },
  "inventory-detail": {
    showsSearch: false,
    component: InventoryDetailPage,
    pageInfoComponent: InventoryDetailPageInfo,
  },
  "data-grid-detail": {
    showsSearch: false,
    component: DataGridDetailPage,
    pageInfoComponent: DataGridDetailPageInfo,
  },
} satisfies Record<SidePanelPageKey, SidePanelPageConfig>;
