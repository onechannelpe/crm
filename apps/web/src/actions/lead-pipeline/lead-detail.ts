"use server";

import {
  getLeadDetail,
  listLeads,
} from "~/server/lead-pipeline/application/detail";
import { runAction } from "~/server/shared/action-runtime";

export async function queryLeadList(filters: {
  stage?: string;
  status?: string;
  prioridad?: string;
  executiveId?: number;
  limit?: number;
  offset?: number;
}) {
  return runAction({
    actionName: "lead_pipeline.list_leads",
    requireAuth: true,
    input: filters,
    execute: (ctx) =>
      listLeads({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        filters,
      }),
  });
}

export async function queryLeadDetail(leadId: number) {
  return runAction({
    actionName: "lead_pipeline.get_lead_detail",
    requireAuth: true,
    input: { leadId },
    execute: (ctx) =>
      getLeadDetail({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId,
      }),
  });
}
