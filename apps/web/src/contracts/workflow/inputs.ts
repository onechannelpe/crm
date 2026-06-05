import type { LeadPriority, LeadStage, LeadStatus } from "./vocabulary";

export type ListLeadsFiltersInput = {
  stage?: LeadStage;
  status?: LeadStatus;
  prioridad?: LeadPriority;
  executiveId?: number;
  anyFieldSearch?: string;
  updatedSinceMs?: number;
  updatedUntilMs?: number;
  sortBy?: "createdAt" | "updatedAt" | "registeredBy" | "ruc";
  sortDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export type ListAssignableExecutivesInput = {
  leadId: string;
  search?: string;
  limit?: number;
};
