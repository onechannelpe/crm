import type {
  LeadPriority,
  LeadStage,
  LeadStatus,
} from "~/pipeline/contracts/lead-schema";

export type LeadListFilters = {
  stage?: LeadStage;
  status?: LeadStatus;
  prioridad?: LeadPriority;
  executiveId?: number;
  limit?: number;
  offset?: number;
};

export type LeadListId = "all" | "review" | "quotation";
