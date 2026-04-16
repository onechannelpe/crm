import type { ActorContext } from "./actor-context";

export type GetLeadDetailInput = {
  actor: ActorContext;
  leadId: number;
};

export type ListAssignableExecutivesInput = {
  actor: ActorContext;
  leadId: number;
  search?: string;
  limit?: number;
};
