import { query } from "@solidjs/router";

import {
  queryLeadDetail,
  queryLeadList,
} from "~/actions/pipeline/queries/leads";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";
import type { LeadListView } from "~/server/pipeline/application/queries/views/lead-list";

import type { LeadListFilters } from "./types";

function normalizeLeadListFilters(filters: LeadListFilters): LeadListFilters {
  return {
    stage: filters.stage,
    status: filters.status,
    prioridad: filters.prioridad,
    executiveId: filters.executiveId,
    limit: filters.limit,
    offset: filters.offset,
  };
}

export const leadListQuery = query(
  async (filters: LeadListFilters): Promise<LeadListView> => {
    return queryLeadList(normalizeLeadListFilters(filters));
  },
  "pipeline.leadList",
);

export function leadListKeyFor(filters: LeadListFilters): string {
  return leadListQuery.keyFor(normalizeLeadListFilters(filters));
}

export const leadDetailQuery = query(
  (leadId: number): Promise<LeadDetailView> => queryLeadDetail(leadId),
  "pipeline.leadDetail",
);
