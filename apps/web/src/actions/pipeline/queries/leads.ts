"use server";

import type {
  LeadDetailView,
  LeadListView,
} from "~/actions/pipeline/contracts";
import { getLeadDetail } from "~/server/pipeline/application/queries/get-lead-detail";
import { listLeads } from "~/server/pipeline/application/queries/list-leads";
import { createPipelineQueryDeps } from "~/server/pipeline/infrastructure/query-runtime";
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
    access: { kind: "auth" },
    input: filters,
    execute: (ctx) =>
      listLeads(createPipelineQueryDeps().leadList, {
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        filters,
      }),
  });
}

export async function queryLeadDetail(leadId: number): Promise<LeadDetailView> {
  return runAction({
    actionName: "pipeline.get_lead_detail",
    access: { kind: "auth" },
    input: { leadId },
    execute: (ctx) =>
      getLeadDetail(createPipelineQueryDeps().leadDetail, {
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId,
      }),
  });
}
