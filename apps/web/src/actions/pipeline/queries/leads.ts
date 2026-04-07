"use server";

import type {
  LeadDetailView,
  LeadListView,
} from "~/actions/pipeline/contracts";
import { getLeadDetail } from "~/server/pipeline/application/queries/get-lead-detail";
import { listLeads } from "~/server/pipeline/application/queries/list-leads";
import { createEngineGateway } from "~/server/pipeline/infrastructure/engine-gateway";
import { createPipelineQueryDeps } from "~/server/pipeline/infrastructure/query-runtime";
import { runAction } from "~/server/shared/action-runtime";
import { Ok } from "~/server/shared/result";

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

export async function queryLeadBootstrapPreview(ruc: string): Promise<{
  razonSocial: string | null;
  address: string | null;
  engineStatus: "available" | "missing" | "failed";
}> {
  return runAction({
    actionName: "pipeline.get_lead_bootstrap_preview",
    access: { kind: "auth" },
    input: { ruc },
    execute: async () => {
      const preview = await createEngineGateway().enrichByRuc(ruc);
      const value: {
        razonSocial: string | null;
        address: string | null;
        engineStatus: "available" | "missing" | "failed";
      } = preview
        ? {
            razonSocial: preview.razonSocial,
            address: preview.address,
            engineStatus: "available",
          }
        : {
            razonSocial: null,
            address: null,
            engineStatus: "missing",
          };

      return Ok(value);
    },
  });
}
