import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";
import type { UserId } from "~/server/shared/ids";

export type LeadListFilters = {
  stage?: LeadStage;
  status?: LeadStatus;
  prioridad?: LeadPriority;
  executiveId?: UserId;
  limit?: number;
  offset?: number;
};
