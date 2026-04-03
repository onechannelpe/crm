"use server";

import { getLeadDetail } from "~/server/pipeline/application/queries/get-lead-detail";
import { listLeads } from "~/server/pipeline/application/queries/list-leads";
import { runAction } from "~/server/shared/action-runtime";

import { createPipelineQueryRuntime } from "../runtime/queries";

export async function queryLeadList(filters: {
  stage?: string;
  status?: string;
  prioridad?: string;
  executiveId?: number;
  limit?: number;
  offset?: number;
}) {
  return runAction({
    actionName: "pipeline.list_leads",
    requireAuth: true,
    input: filters,
    execute: (ctx) =>
      listLeads(createPipelineQueryRuntime(), {
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        filters,
      }),
  });
}

export async function queryLeadDetail(leadId: number) {
  return runAction({
    actionName: "pipeline.get_lead_detail",
    requireAuth: true,
    input: { leadId },
    execute: (ctx) =>
      getLeadDetail(createPipelineQueryRuntime(), {
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId,
      }),
  });
}
