"use server";

import {
  type ListAssignableExecutivesInput,
  type ListLeadsFiltersInput,
} from "~/contracts/workflow/inputs";
import {
  type AssignableExecutiveView,
  type LeadBootstrapPreviewView,
  type LeadDetailView,
  type LeadListView,
} from "~/contracts/workflow/views";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function queryLeadList(
  filters: ListLeadsFiltersInput,
): Promise<LeadListView> {
  return runAction({
    actionName: "workflow.list_leads",
    access: { kind: "auth" },
    input: filters,

    execute: ({ actor }) =>
      getServerRuntime().workflow.queries.listLeads({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        filters,
      }),
  });
}

export async function queryLeadDetail(leadId: string): Promise<LeadDetailView> {
  return runAction({
    actionName: "workflow.get_lead_detail",
    access: { kind: "auth" },
    input: { leadId },

    execute: ({ actor }) =>
      getServerRuntime().workflow.queries.getLeadDetail({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
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

export async function queryAssignableExecutives(
  input: ListAssignableExecutivesInput,
): Promise<AssignableExecutiveView[]> {
  return runAction({
    actionName: "workflow.list_assignable_executives",
    access: { kind: "auth" },
    input,

    execute: ({ actor }) =>
      getServerRuntime().workflow.queries.listAssignableExecutives({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        ...input,
      }),
  });
}
