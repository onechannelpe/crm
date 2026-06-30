import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/contracts/workflow/vocabulary";
import type { UserId, WorkflowLeadId } from "~/server/shared/ids";

import type { WorkflowActor } from "../../actor";

export type ListAssignableExecutivesInput = {
  actor: WorkflowActor;
  leadId: WorkflowLeadId;
  search?: string;
  limit?: number;
};

export type ListLeadsInput = {
  actor: WorkflowActor;
  filters: {
    stage?: LeadStage;
    status?: LeadStatus;
    priority?: LeadPriority;
    executiveId?: UserId;
    anyFieldSearch?: string;
    updatedSinceMs?: number;
    updatedUntilMs?: number;
    sortBy?: "createdAt" | "updatedAt" | "registeredBy" | "ruc";
    sortDirection?: "asc" | "desc";
    limit?: number;
    offset?: number;
  };
};
