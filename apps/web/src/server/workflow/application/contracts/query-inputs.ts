import type { ActorContext } from "./actor-context";

export type GetLeadDetailInput = {
  actor: ActorContext;
  leadId: string;
};

export type ListAssignableExecutivesInput = {
  actor: ActorContext;
  leadId: string;
  search?: string;
  limit?: number;
};

export type LeadListFiltersInput = {
  stage?: string;
  status?: string;
  prioridad?: string;
  executiveId?: number;
  updatedSinceMs?: number;
  updatedUntilMs?: number;
  sortBy?: "createdAt" | "updatedAt" | "registeredBy" | "ruc";
  sortDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
};

export type ListLeadsInput = {
  actor: ActorContext;
  filters: LeadListFiltersInput;
};
