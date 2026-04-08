import { query } from "@solidjs/router";

import { queryLeadList } from "~/actions/pipeline/queries/leads";
import type { LeadListView } from "~/server/pipeline/application/queries/views/lead-list";

import type { LeadListFilters, LeadListId } from "./types";

export const LEAD_LIST_FILTERS_BY_ID: Record<LeadListId, LeadListFilters> = {
  all: {},
  review: { stage: "PENDING_EXTERNAL_REVIEW" },
  quotation: { stage: "READY_FOR_QUOTATION" },
};

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

export function leadListKeyForId(id: LeadListId): string {
  return leadListKeyFor(LEAD_LIST_FILTERS_BY_ID[id]);
}
