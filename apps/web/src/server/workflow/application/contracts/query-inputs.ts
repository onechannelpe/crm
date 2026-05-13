import type { ActorContext, LeadListFiltersInput } from "~/contracts/workflow";

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

export type ListLeadsInput = {
  actor: ActorContext;
  filters: LeadListFiltersInput;
};
