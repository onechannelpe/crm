import type { recordLeadCall } from "~/actions/pipeline/commands/interactions";
import type { queryLeadDetail } from "~/actions/pipeline/queries/leads";

export type LeadDetailData = Awaited<ReturnType<typeof queryLeadDetail>>;
export type LeadAction = LeadDetailData["availableActions"][number];
export type TimelineItem = LeadDetailData["timeline"][number];
export type LeadCallOutcome = Parameters<typeof recordLeadCall>[0]["outcome"];
