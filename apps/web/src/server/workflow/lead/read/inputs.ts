import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/contracts/workflow/vocabulary";
import type { UserId, WorkflowLeadId } from "~/domain/ids";

import type { WorkflowActor } from "../../actor";

export type ListLeadsInput = {
  actor: WorkflowActor;
  filters: {
    stage?: LeadStage;
    status?: LeadStatus;
    priority?: LeadPriority;
    executiveId?: UserId;
    anyFieldSearch?: string;
    updatedToday?: boolean;
    sortBy?: "createdAt" | "updatedAt" | "registeredBy" | "ruc";
    sortDirection?: "asc" | "desc";
    limit?: number;
    offset?: number;
  };
};
