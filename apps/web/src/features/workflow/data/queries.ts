import { query } from "@solidjs/router";

import type { AssignableExecutiveView } from "~/contracts/workflow";
import type { LeadDetailView } from "~/contracts/workflow";
import type { LeadListView } from "~/contracts/workflow";
import {
  queryAssignableExecutivesApi,
  queryLeadDetailApi,
  queryLeadListApi,
} from "~/features/workflow/api/queries";

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
    return queryLeadListApi(normalizeLeadListFilters(filters));
  },
  "workflow.leadList",
);

export function leadListKeyFor(filters: LeadListFilters): string {
  return leadListQuery.keyFor(normalizeLeadListFilters(filters));
}

export const leadDetailQuery = query(
  (leadId: string): Promise<LeadDetailView> => queryLeadDetailApi(leadId),
  "workflow.leadDetail",
);

export const assignableExecutivesQuery = query(
  (input: {
    leadId: string;
    search?: string;
    limit?: number;
  }): Promise<AssignableExecutiveView[]> => queryAssignableExecutivesApi(input),
  "workflow.assignableExecutives",
);
