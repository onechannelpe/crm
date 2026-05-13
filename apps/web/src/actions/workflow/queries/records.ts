"use server";

import { workflowActorFrom } from "~/actions/workflow/shared";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { LeadListFiltersInput } from "~/contracts/workflow";
import type { AssignableExecutiveView } from "~/contracts/workflow";
import type { LeadBootstrapPreviewView } from "~/contracts/workflow";
import type { LeadDetailView } from "~/contracts/workflow";
import type { LeadListView } from "~/contracts/workflow";

export async function queryLeadList(
  filters: LeadListFiltersInput,
): Promise<LeadListView> {
  return runAction({
    actionName: "workflow.list_leads",
    access: { kind: "auth" },
    input: filters,
    execute: (ctx) =>
      getServerRuntime().workflow.queries.listLeads({
        actor: workflowActorFrom(ctx),
        filters,
      }),
  });
}

export async function queryLeadDetail(leadId: string): Promise<LeadDetailView> {
  return runAction({
    actionName: "workflow.get_lead_detail",
    access: { kind: "auth" },
    input: { leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.queries.getLeadDetail({
        actor: workflowActorFrom(ctx),
        leadId,
      }),
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
      getServerRuntime().workflow.queries.getLeadBootstrapPreview({ ruc }),
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
    execute: (ctx) =>
      getServerRuntime().workflow.queries.listAssignableExecutives({
        actor: workflowActorFrom(ctx),
        leadId: input.leadId,
        search: input.search,
        limit: input.limit,
      }),
  });
}
