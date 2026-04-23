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
