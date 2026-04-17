import type { Component } from "solid-js";

import { CreateLeadPage } from "../pages/create-lead/page";
import { CreateLeadPageInfo } from "../pages/create-lead/page-info";
import { DataGridDetailPage } from "../pages/data-grid-detail/page";
import { DataGridDetailPageInfo } from "../pages/data-grid-detail/page-info";
import { InventoryDetailPage } from "../pages/inventory-detail/page";
import { InventoryDetailPageInfo } from "../pages/inventory-detail/page-info";
import { RecordPage } from "../pages/record-page/page";
import { RecordPageInfo } from "../pages/record-page/page-info";
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
  "create-lead": {
    showsSearch: false,
    component: CreateLeadPage,
    pageInfoComponent: CreateLeadPageInfo,
    topBarActionsComponent: undefined,
  },
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
  "view-record": {
    showsSearch: false,
    component: RecordPage,
    pageInfoComponent: RecordPageInfo,
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
