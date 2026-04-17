"use server";

import { getLeadBootstrapPreview } from "~/server/pipeline/application/queries/get-lead-bootstrap-preview";
import { listLeads } from "~/server/pipeline/application/queries/list-leads";
import type { AssignableExecutiveView } from "~/server/pipeline/application/queries/views/assignable-executive";
import type { LeadBootstrapPreviewView } from "~/server/pipeline/application/queries/views/lead-bootstrap-preview";
import type { LeadDetailView } from "~/server/pipeline/application/queries/views/lead-detail";
import type { LeadListView } from "~/server/pipeline/application/queries/views/lead-list";
import type { LeadId } from "~/server/pipeline/domain/lead-record";
import { createPipelineQueryApiRuntime } from "~/server/pipeline/infrastructure/runtime/pipeline-query-api-factory";
import { serverRuntime } from "~/server/runtime";
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
      listLeads(serverRuntime.pipeline.deps.leadList, {
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        filters,
      }),
  });
}

export async function queryLeadDetail(leadId: LeadId): Promise<LeadDetailView> {
  return runAction({
    actionName: "pipeline.get_lead_detail",
    access: { kind: "auth" },
    input: { leadId },
    execute: (ctx) => {
      const queryApi = createPipelineQueryApiRuntime(
        serverRuntime.pipeline.deps,
      );
      return queryApi.getLeadDetail({
        actor: {
          userId: ctx.actor.userId,
          role: ctx.actor.role,
          branchId: ctx.actor.branchId,
        },
        leadId,
      });
    },
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
      getLeadBootstrapPreview(
        serverRuntime.pipeline.deps.leadBootstrapPreview,
        {
          ruc,
        },
      ),
  });
}

export async function queryAssignableExecutives(input: {
  leadId: LeadId;
  search?: string;
  limit?: number;
}): Promise<AssignableExecutiveView[]> {
  return runAction({
    actionName: "pipeline.list_assignable_executives",
    access: { kind: "auth" },
    input,
    execute: (ctx) => {
      const queryApi = createPipelineQueryApiRuntime(
        serverRuntime.pipeline.deps,
      );
      return queryApi.listAssignableExecutives({
        actor: {
          userId: ctx.actor.userId,
          role: ctx.actor.role,
          branchId: ctx.actor.branchId,
        },
        leadId: input.leadId,
        search: input.search,
        limit: input.limit,
      });
    },
  });
}
