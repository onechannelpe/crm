"use server";

import {
  toGetLeadDetailInput,
  toListAssignableExecutivesInput,
  toListLeadsInput,
} from "~/actions/workflow/mappers";
import type {
  AssignableExecutivesInput,
  AssignableExecutiveView,
  LeadBootstrapPreviewView,
  LeadDetailView,
  LeadListFiltersInput,
  LeadListView,
} from "~/contracts/workflow";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function queryLeadList(
  filters: LeadListFiltersInput,
): Promise<LeadListView> {
  return runAction({
    actionName: "workflow.list_leads",
    access: { kind: "auth" },
    input: filters,
    execute: (ctx) =>
      getServerRuntime().workflow.queries.listLeads(
        toListLeadsInput(ctx, filters),
      ),
  });
}

export async function queryLeadDetail(leadId: string): Promise<LeadDetailView> {
  return runAction({
    actionName: "workflow.get_lead_detail",
    access: { kind: "auth" },
    input: { leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.queries.getLeadDetail(
        toGetLeadDetailInput(ctx, leadId),
      ),
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

export async function queryAssignableExecutives(
  input: AssignableExecutivesInput,
): Promise<AssignableExecutiveView[]> {
  return runAction({
    actionName: "workflow.list_assignable_executives",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.queries.listAssignableExecutives(
        toListAssignableExecutivesInput(ctx, input),
      ),
  });
}
