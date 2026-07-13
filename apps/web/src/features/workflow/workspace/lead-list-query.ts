import type { ListLeadsFiltersInput } from "~/contracts/workflow/inputs";

import {
  LEAD_WORKSPACE_FILTER_DEFAULT,
  resolveLeadWorkspaceFilterQuery,
} from "./filter-query";
import {
  LEAD_WORKSPACE_SORT_DEFAULT,
  resolveLeadWorkspaceSortQuery,
} from "./sort-query";
import {
  defaultViewIdForRole,
  resolveWorkspaceView,
  viewsForRole,
} from "./views";

export const LEAD_PAGE_SIZE = 100;

// Raw route inputs (search params + page) that determine which slice of leads to
// fetch. Kept as the untrusted, un-defaulted shape so both the route preload and
// the in-component createAsync feed the exact same builder and land on one
// leadListQuery cache key.
type LeadListQueryParams = {
  view: string | undefined;
  filter: string | undefined;
  sort: string | undefined;
  search: string | undefined;
  pageIndex: number;
};

export function parseLeadPageIndex(value: string | undefined): number {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : 0;
}

// Single owner of the route-params -> leadListQuery input mapping. The view's own
// filters apply first so an explicit filter param can still override the view's
// stage (e.g. the "review" view seeds stage=QUALIFYING, a status filter narrows it).
export function resolveLeadListQueryInput(
  params: LeadListQueryParams,
  user: { id: string; role: string },
): ListLeadsFiltersInput {
  const activeView = resolveWorkspaceView(
    viewsForRole(user.role),
    defaultViewIdForRole(user.role),
    params.view,
  );

  return {
    ...activeView.filters(user.id),
    ...resolveLeadWorkspaceFilterQuery(
      params.filter ?? LEAD_WORKSPACE_FILTER_DEFAULT,
    ),
    ...resolveLeadWorkspaceSortQuery(
      params.sort ?? LEAD_WORKSPACE_SORT_DEFAULT,
    ),
    anyFieldSearch: params.search?.trim() || undefined,
    limit: LEAD_PAGE_SIZE,
    offset: params.pageIndex * LEAD_PAGE_SIZE,
  };
}
