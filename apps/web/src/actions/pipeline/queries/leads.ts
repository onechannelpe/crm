"use server";

import { getLeadBootstrapPreview } from "~/server/pipeline/application/queries/get-lead-bootstrap-preview";
import { getLeadDetail } from "~/server/pipeline/application/queries/get-lead-detail";
import { listLeads } from "~/server/pipeline/application/queries/list-leads";
import type { LeadBootstrapPreviewView } from "~/server/pipeline/application/queries/views/lead-bootstrap-preview";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";
import type { LeadListView } from "~/server/pipeline/application/queries/views/lead-list";
import { createPipelineDeps } from "~/server/pipeline/infrastructure/deps";
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
      listLeads(createPipelineDeps().leadList, {
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
      getLeadDetail(createPipelineDeps().leadDetail, {
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        leadId,
      }),
  });
}

export async function queryLeadBootstrapPreview(
  ruc: string,
): Promise<LeadBootstrapPreviewView> {
  return runAction({
    actionName: "pipeline.get_lead_bootstrap_preview",
    access: { kind: "auth" },
    input: { ruc },
    execute: () =>
      getLeadBootstrapPreview(createPipelineDeps().leadBootstrapPreview, {
        ruc,
      }),
  });
}
