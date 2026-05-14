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
};
