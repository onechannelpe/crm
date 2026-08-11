import { lazy, type Component } from "solid-js";

import { CompactDetailPageSkeleton } from "../pages/common/skeletons/compact-detail-page-skeleton";
import { ListPageSkeleton } from "../pages/common/skeletons/list-page-skeleton";
import { RecordPageSkeleton } from "../pages/common/skeletons/record-page-skeleton";
import { CreateLeadPageInfo } from "../pages/create-lead/page-info";
import { DataGridDetailPageInfo } from "../pages/data-grid-detail/page-info";
import { LeadActionPageInfo } from "../pages/lead-action/page-info";
import { RecordPageInfo } from "../pages/record-page/page-info";
import { SearchCompanyPageInfo } from "../pages/search-company/page-info";
import { SearchPersonPageInfo } from "../pages/search-person/page-info";
import type { SidePanelPageKey } from "../types/side-panel-page";

// Keep page bodies lazy; skeletons and header chrome stay eager.
const CreateLeadPage = lazy(() =>
  import("../pages/create-lead/page").then((m) => ({
    default: m.CreateLeadPage,
  })),
);

const RootPage = lazy(() =>
  import("../pages/root/page").then((m) => ({
    default: m.RootPage,
  })),
);

const SearchRecordsPage = lazy(() =>
  import("../pages/search-records/page").then((m) => ({
    default: m.SearchRecordsPage,
  })),
);

const SearchPersonPage = lazy(() =>
  import("../pages/search-person/page").then((m) => ({
    default: m.SearchPersonPage,
  })),
);

const SearchCompanyPage = lazy(() =>
  import("../pages/search-company/page").then((m) => ({
    default: m.SearchCompanyPage,
  })),
);

const RecordPage = lazy(() =>
  import("../pages/record-page/page").then((m) => ({
    default: m.RecordPage,
  })),
);

const LeadActionPage = lazy(() =>
  import("../pages/lead-action/page").then((m) => ({
    default: m.LeadActionPage,
  })),
);

const DataGridDetailPage = lazy(() =>
  import("../pages/data-grid-detail/page").then((m) => ({
    default: m.DataGridDetailPage,
  })),
);

// These are the only pages commonly opened before the panel is already active.
export function preloadSidePanelEntryPages(): void {
  void RootPage.preload();
  void SearchRecordsPage.preload();
}

// Hover or focus is a strong enough signal to preload the matching detail page.
export function preloadSidePanelSearchResultDetailPage(
  kind: "person" | "company",
): void {
  if (kind === "person") {
    void SearchPersonPage.preload();
    return;
  }

  void SearchCompanyPage.preload();
}

type SidePanelPageConfig = {
  showsSearch: boolean;
  component: Component;
  skeleton: Component;
  pageInfoComponent?: Component;
  topBarActionsComponent?: Component;
};

export const SIDE_PANEL_PAGES_CONFIG = {
  "create-lead": {
    showsSearch: false,
    component: CreateLeadPage,
    skeleton: RecordPageSkeleton,
    pageInfoComponent: CreateLeadPageInfo,
    topBarActionsComponent: undefined,
  },
  root: {
    showsSearch: true,
    component: RootPage,
    skeleton: ListPageSkeleton,
    pageInfoComponent: undefined,
    topBarActionsComponent: undefined,
  },
  "search-records": {
    showsSearch: true,
    component: SearchRecordsPage,
    skeleton: ListPageSkeleton,
    pageInfoComponent: undefined,
    topBarActionsComponent: undefined,
  },
  "search-person-detail": {
    showsSearch: false,
    component: SearchPersonPage,
    skeleton: CompactDetailPageSkeleton,
    pageInfoComponent: SearchPersonPageInfo,
    topBarActionsComponent: undefined,
  },
  "search-company-detail": {
    showsSearch: false,
    component: SearchCompanyPage,
    skeleton: CompactDetailPageSkeleton,
    pageInfoComponent: SearchCompanyPageInfo,
    topBarActionsComponent: undefined,
  },
  "view-record": {
    showsSearch: false,
    component: RecordPage,
    skeleton: RecordPageSkeleton,
    pageInfoComponent: RecordPageInfo,
    topBarActionsComponent: undefined,
  },
  "lead-action": {
    showsSearch: false,
    component: LeadActionPage,
    skeleton: RecordPageSkeleton,
    pageInfoComponent: LeadActionPageInfo,
    topBarActionsComponent: undefined,
  },
  "data-grid-detail": {
    showsSearch: false,
    component: DataGridDetailPage,
    skeleton: CompactDetailPageSkeleton,
    pageInfoComponent: DataGridDetailPageInfo,
    topBarActionsComponent: undefined,
  },
} satisfies Record<SidePanelPageKey, SidePanelPageConfig>;
