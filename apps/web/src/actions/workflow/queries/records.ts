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
import {
  LEAD_PRIORITIES,
  LEAD_STAGES,
  LEAD_STATUSES,
} from "~/contracts/workflow/vocabulary";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import type { Result } from "~/server/shared/result";

import { workflowActor } from "../commands/actor";

const SORT_FIELDS = ["createdAt", "updatedAt", "registeredBy", "ruc"] as const;
const SORT_DIRECTIONS = ["asc", "desc"] as const;

function parseListLeadsFilters(
  input: unknown,
): Result<ListLeadsFiltersInput, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    stage: r.optEnum("stage", LEAD_STAGES),
    status: r.optEnum("status", LEAD_STATUSES),
    prioridad: r.optEnum("prioridad", LEAD_PRIORITIES),
    executiveId: r.optNum("executiveId") ?? undefined,
    anyFieldSearch: r.optStr("anyFieldSearch") ?? undefined,
    updatedSinceMs: r.optNum("updatedSinceMs") ?? undefined,
    updatedUntilMs: r.optNum("updatedUntilMs") ?? undefined,
    sortBy: r.optEnum("sortBy", SORT_FIELDS),
    sortDirection: r.optEnum("sortDirection", SORT_DIRECTIONS),
    limit: r.optNum("limit") ?? undefined,
    offset: r.optNum("offset") ?? undefined,
  }));
}

function parseAssignableExecutives(
  input: unknown,
): Result<ListAssignableExecutivesInput, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
    search: r.optStr("search") ?? undefined,
    limit: r.optNum("limit") ?? undefined,
  }));
}

export async function queryLeadList(
  filters: ListLeadsFiltersInput,
): Promise<LeadListView> {
  return runAction({
    actionName: "workflow.list_leads",
    access: { kind: "auth" },
    parse: () => parseListLeadsFilters(filters),
    audit: ({ stage, status }) => ({
      stage: stage ?? null,
      status: status ?? null,
    }),
    execute: ({ actor }, parsed) =>
      getServerRuntime().workflow.queries.listLeads({
        actor: workflowActor(actor),
        filters: parsed,
      }),
  });
}

export async function queryLeadDetail(leadId: string): Promise<LeadDetailView> {
  return runAction({
    actionName: "workflow.get_lead_detail",
    access: { kind: "auth" },
    parse: () =>
      parseObject({ leadId }, validationFail, (r) => ({
        leadId: r.str("leadId"),
      })),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, { leadId }) =>
      getServerRuntime().workflow.queries.getLeadDetail({
        actor: workflowActor(actor),
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
    parse: () =>
      parseObject({ ruc }, validationFail, (r) => ({ ruc: r.str("ruc") })),
    audit: ({ ruc }) => ({ ruc }),
    execute: (_ctx, { ruc }) =>
      getServerRuntime().workflow.queries.getLeadBootstrapPreview({ ruc }),
  });
}

export async function queryAssignableExecutives(
  input: ListAssignableExecutivesInput,
): Promise<AssignableExecutiveView[]> {
  return runAction({
    actionName: "workflow.list_assignable_executives",
    access: { kind: "auth" },
    parse: () => parseAssignableExecutives(input),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, parsed) =>
      getServerRuntime().workflow.queries.listAssignableExecutives({
        actor: workflowActor(actor),
        ...parsed,
      }),
  });
}
