"use server";

import type {
  LeadDetailView,
  LeadListView,
} from "~/server/pipeline/application/contracts";
import { getLeadDetail } from "~/server/pipeline/application/queries/get-lead-detail";
import { listLeads } from "~/server/pipeline/application/queries/list-leads";
import { createPipelineQueryRuntime } from "~/server/pipeline/infrastructure/query-runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function queryLeadList(filters: {
  stage?: string;
  status?: string;
  prioridad?: string;
  executiveId?: number;
  limit?: number;
  offset?: number;
}): Promise<LeadListView> {
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

export async function queryLeadDetail(leadId: number): Promise<LeadDetailView> {
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
