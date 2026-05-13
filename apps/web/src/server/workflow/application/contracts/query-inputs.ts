import type { LeadListFiltersInput } from "~/contracts/workflow";
import type { ActorContext } from "~/contracts/workflow";

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
