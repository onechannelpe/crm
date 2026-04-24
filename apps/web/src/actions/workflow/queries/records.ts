"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import { getLeadBootstrapPreview } from "~/server/workflow/application/queries/get-lead-bootstrap-preview";
import { listLeads } from "~/server/workflow/application/queries/list-leads";
import type { AssignableExecutiveView } from "~/server/workflow/application/queries/views/assignable-executive";
import type { LeadBootstrapPreviewView } from "~/server/workflow/application/queries/views/lead-bootstrap-preview";
import type { LeadDetailView } from "~/server/workflow/application/queries/views/lead-detail";
import type { LeadListView } from "~/server/workflow/application/queries/views/lead-list";
import { createWorkflowQueryApiRuntime } from "~/server/workflow/infrastructure/runtime/workflow-query-api-factory";

export async function queryLeadList(filters: {
  stage?: string;
  status?: string;
  prioridad?: string;
  executiveId?: number;
  updatedSinceMs?: number;
  updatedUntilMs?: number;
  sortBy?: "createdAt" | "updatedAt" | "registeredBy" | "ruc";
  sortDirection?: "asc" | "desc";
  limit?: number;
  offset?: number;
}): Promise<LeadListView> {
  return runAction({
    actionName: "workflow.list_leads",
    access: { kind: "auth" },
    input: filters,
    execute: (ctx) =>
      listLeads(getServerRuntime().workflow.deps.leadList, {
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        filters,
      }),
  });
}

export async function queryLeadDetail(leadId: string): Promise<LeadDetailView> {
  return runAction({
    actionName: "workflow.get_lead_detail",
    access: { kind: "auth" },
    input: { leadId },
    execute: (ctx) => {
      const queryApi = createWorkflowQueryApiRuntime(
        getServerRuntime().workflow.deps,
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
    actionName: "workflow.get_lead_bootstrap_preview",
    access: { kind: "auth" },
    input: { ruc },
    execute: () =>
      getLeadBootstrapPreview(
        getServerRuntime().workflow.deps.leadBootstrapPreview,
        {
          ruc,
        },
      ),
  });
}

export async function queryAssignableExecutives(input: {
  leadId: string;
  search?: string;
  limit?: number;
}): Promise<AssignableExecutiveView[]> {
  return runAction({
    actionName: "workflow.list_assignable_executives",
    access: { kind: "auth" },
    input,
    execute: (ctx) => {
      const queryApi = createWorkflowQueryApiRuntime(
        getServerRuntime().workflow.deps,
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
