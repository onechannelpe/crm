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

// Keep raw route inputs un-defaulted so every caller resolves the same cache key.
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

// Explicit URL filters override the selected view's defaults.
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
