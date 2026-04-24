import { query } from "@solidjs/router";

import {
  queryAssignableExecutives,
  queryLeadDetail,
  queryLeadList,
} from "~/actions/workflow/queries/records";
import type { AssignableExecutiveView } from "~/server/workflow/application/queries/views/assignable-executive";
import type { LeadDetailView } from "~/server/workflow/application/queries/views/lead-detail";
import type { LeadListView } from "~/server/workflow/application/queries/views/lead-list";

import type { LeadListFilters } from "./types";

function normalizeLeadListFilters(filters: LeadListFilters): LeadListFilters {
  return {
    stage: filters.stage,
    status: filters.status,
    prioridad: filters.prioridad,
    executiveId: filters.executiveId,
    updatedSinceMs: filters.updatedSinceMs,
    updatedUntilMs: filters.updatedUntilMs,
    sortBy: filters.sortBy,
    sortDirection: filters.sortDirection,
    limit: filters.limit,
    offset: filters.offset,
  };
}

export const leadListQuery = query(
  async (filters: LeadListFilters): Promise<LeadListView> => {
    return queryLeadList(normalizeLeadListFilters(filters));
  },
  "workflow.leadList",
);

export function leadListKeyFor(filters: LeadListFilters): string {
  return leadListQuery.keyFor(normalizeLeadListFilters(filters));
}

export const leadDetailQuery = query(
  (leadId: string): Promise<LeadDetailView> => queryLeadDetail(leadId),
  "workflow.leadDetail",
);

export const assignableExecutivesQuery = query(
  (input: {
    leadId: string;
    search?: string;
    limit?: number;
  }): Promise<AssignableExecutiveView[]> => queryAssignableExecutives(input),
  "workflow.assignableExecutives",
);
