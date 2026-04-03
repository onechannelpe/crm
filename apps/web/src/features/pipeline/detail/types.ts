import type {
  LeadAction,
  LeadCallOutcome,
  LeadDetailData,
} from "~/actions/pipeline/contracts/lead-detail";

export type TimelineItem = LeadDetailData["timeline"][number];
export type { LeadAction, LeadCallOutcome, LeadDetailData };
