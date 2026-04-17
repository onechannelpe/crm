import type { ActorContext } from "./actor-context";
import type { LeadId } from "~/server/pipeline/domain/lead-record";

export type GetLeadDetailInput = {
  actor: ActorContext;
  leadId: LeadId;
};

export type ListAssignableExecutivesInput = {
  actor: ActorContext;
  leadId: LeadId;
  search?: string;
  limit?: number;
};
