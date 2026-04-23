import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/workflow/contracts/lead-schema";

export type LeadListFilters = {
  stage?: LeadStage;
  status?: LeadStatus;
  prioridad?: LeadPriority;
  executiveId?: number;
  limit?: number;
  offset?: number;
};
