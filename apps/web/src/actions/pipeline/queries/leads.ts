"use server";

import { getLeadDetail } from "~/server/pipeline/application/queries/get-lead-detail";
import { listLeads } from "~/server/pipeline/application/queries/list-leads";
import {
  createLeadDetailDeps,
  createLeadListDeps,
} from "~/server/pipeline/infrastructure/deps";
import { runAction } from "~/server/shared/action-runtime";

import type { LeadDetailData } from "../contracts/lead-detail";
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
      listLeads(createPipelineQueryRuntime(createLeadListDeps), {
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        filters,
      }),
  });
}

export async function queryLeadDetail(leadId: number): Promise<LeadDetailData> {
  return runAction({
    actionName: "pipeline.get_lead_detail",
    requireAuth: true,
    input: { leadId },
    execute: (ctx) =>
      getLeadDetail(createPipelineQueryRuntime(createLeadDetailDeps), {
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId,
      }),
  });
}
