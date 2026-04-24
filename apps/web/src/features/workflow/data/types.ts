import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/workflow/contracts/lead-schema";

export type LeadListFilters = {
  stage?: LeadStage;
  status?: LeadStatus;
  prioridad?: LeadPriority;
  executiveId?: number;
  updatedSinceMs?: number;
  updatedUntilMs?: number;
  sortBy?: "createdAt" | "updatedAt" | "registeredBy" | "ruc";
  sortDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
};
