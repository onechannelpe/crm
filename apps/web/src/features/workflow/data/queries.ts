import { query } from "@solidjs/router";

import {
  queryAssignableExecutives,
  queryFulfillmentQueue,
  queryLeadDetail,
  queryLeadList,
} from "~/actions/workflow/queries/records";
import {
  type ListAssignableExecutivesInput,
  type ListLeadsFiltersInput,
} from "~/contracts/workflow/inputs";
import {
  type AssignableExecutiveView,
  type FulfillmentQueueView,
  type LeadDetailView,
  type LeadListView,
} from "~/contracts/workflow/views";

function normalizeLeadListFilters(
  filters: ListLeadsFiltersInput,
): ListLeadsFiltersInput {
  return {
    stage: filters.stage,
    status: filters.status,
    priority: filters.priority,
    executiveId: filters.executiveId,
    anyFieldSearch: filters.anyFieldSearch,
    updatedSinceMs: filters.updatedSinceMs,
    updatedUntilMs: filters.updatedUntilMs,
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection,
    limit: filters.limit,
    offset: filters.offset,
  };
}

export const leadListQuery = query(
  (filters: ListLeadsFiltersInput): Promise<LeadListView> =>
    queryLeadList(normalizeLeadListFilters(filters)),
  "workflow.leadList",
);

export const leadDetailQuery = query(
  (leadId: string): Promise<LeadDetailView> => queryLeadDetail(leadId),
  "workflow.leadDetail",
);

export const assignableExecutivesQuery = query(
  (input: ListAssignableExecutivesInput): Promise<AssignableExecutiveView[]> =>
    queryAssignableExecutives(input),
  "workflow.assignableExecutives",
);

export const fulfillmentQueueQuery = query(
  (): Promise<FulfillmentQueueView> => queryFulfillmentQueue(),
  "workflow.fulfillmentQueue",
);
