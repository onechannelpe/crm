"use server";

import { getLeadDetail } from "~/server/pipeline/application/queries/get-lead-detail";
import { listLeads } from "~/server/pipeline/application/queries/list-leads";
import type {
  LeadDetailView,
  LeadTimelineItem,
} from "~/server/pipeline/application/queries/views/lead-detail-view";
import type { LeadListView } from "~/server/pipeline/application/queries/views/lead-list-view";
import { createPipelineQueryRuntime } from "~/server/pipeline/infrastructure/query-runtime";
import { runAction } from "~/server/shared/action-runtime";

export type LeadDetailOutput = LeadDetailView;
export type LeadAction = LeadDetailView["availableActions"][number];
export type TimelineItem = LeadTimelineItem;
export type LeadListOutput = LeadListView;
export type LeadListRow = LeadListView["rows"][number];

export async function queryLeadList(filters: {
  stage?: string;
  status?: string;
  prioridad?: string;
  executiveId?: number;
  limit?: number;
  offset?: number;
}): Promise<LeadListOutput> {
  return runAction({
    actionName: "pipeline.list_leads",
    requireAuth: true,
    input: filters,
    execute: (ctx) =>
      listLeads(createPipelineQueryRuntime().deps.leadList, {
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        filters,
      }),
  });
}

export async function queryLeadDetail(
  leadId: number,
): Promise<LeadDetailOutput> {
  return runAction({
    actionName: "pipeline.get_lead_detail",
    requireAuth: true,
    input: { leadId },
    execute: (ctx) =>
      getLeadDetail(createPipelineQueryRuntime().deps.leadDetail, {
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId,
      }),
  });
}
