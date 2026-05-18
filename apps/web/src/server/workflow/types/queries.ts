import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/contracts/workflow/vocabulary";

import type { WorkflowActor } from "./actor";

export type ListAssignableExecutivesInput = {
  actor: WorkflowActor;
  leadId: string;
  search?: string;
  limit?: number;
};

export type ListLeadsInput = {
  actor: WorkflowActor;
  filters: {
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
};
