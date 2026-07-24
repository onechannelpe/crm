import { query } from "@solidjs/router";

import { queryMyInquiries } from "~/actions/workflow/queries/inquiries";
import {
  queryAssignableExecutives,
  queryFulfillmentQueue,
  queryLeadDetail,
  queryLeadList,
  queryPendingQuotationCount,
} from "~/actions/workflow/queries/records";
import {
  type ListAssignableExecutivesInput,
  type ListLeadsFiltersInput,
} from "~/contracts/workflow/inputs";
import {
  type AssignableExecutiveView,
  type FulfillmentQueueView,
  type InquiryListView,
  type LeadDetailView,
  type LeadListView,
  type PendingQuotationCountView,
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
    updatedToday: filters.updatedToday,
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
  async (
    leadId: string,
  ): Promise<LeadDetailView & { evaluatedAt: number }> => ({
    ...(await queryLeadDetail(leadId)),
    evaluatedAt: Date.now(),
  }),
  "workflow.leadDetail",
);

export const assignableExecutivesQuery = query(
  (input: ListAssignableExecutivesInput): Promise<AssignableExecutiveView[]> =>
    queryAssignableExecutives(input),
  "workflow.assignableExecutives",
);

export const fulfillmentQueueQuery = query(
  async (): Promise<FulfillmentQueueView & { evaluatedAt: number }> => ({
    ...(await queryFulfillmentQueue()),
    evaluatedAt: Date.now(),
  }),
  "workflow.fulfillmentQueue",
);

export const pendingQuotationCountQuery = query(
  (): Promise<PendingQuotationCountView> => queryPendingQuotationCount(),
  "workflow.pendingQuotationCount",
);

export const inquiryListQuery = query(
  (): Promise<InquiryListView> => queryMyInquiries(),
  "workflow.inquiryList",
);
