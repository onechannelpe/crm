"use server";

import {
  type ListAssignableExecutivesInput,
  type ListLeadsFiltersInput,
} from "~/contracts/workflow/inputs";
import { MAX_PENDING_QUOTATION_DECISIONS } from "~/contracts/workflow/limits";
import {
  type AssignableExecutiveView,
  type FulfillmentQueueView,
  type LeadBootstrapPreviewView,
  type LeadDetailView,
  type LeadListView,
  type PendingQuotationCountView,
} from "~/contracts/workflow/views";
import {
  LEAD_PRIORITIES,
  LEAD_STAGES,
  LEAD_STATUSES,
} from "~/contracts/workflow/vocabulary";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { asUserId, asWorkflowLeadId } from "~/server/shared/ids";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";
import { getLeadBootstrapPreview } from "~/server/workflow/lead/read/queries/get-lead-bootstrap-preview";
import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";
import { listAssignableExecutives } from "~/server/workflow/lead/read/queries/list-assignable-executives";
import { listFulfillmentQueue } from "~/server/workflow/lead/read/queries/list-fulfillment-queue";
import { listLeads } from "~/server/workflow/lead/read/queries/list-leads";
import { createWorkflowRepos } from "~/server/workflow/repos";

import { workflowActor } from "../commands/actor";

const SORT_FIELDS = ["createdAt", "updatedAt", "registeredBy", "ruc"] as const;
const SORT_DIRECTIONS = ["asc", "desc"] as const;

export async function queryLeadList(
  filters: ListLeadsFiltersInput,
): Promise<LeadListView> {
  return runAction({
    name: "workflow.list_leads",
    access: { kind: "auth" },

    parse: () =>
      parseObject(filters, validationFail, (r) => ({
        stage: r.optEnum("stage", LEAD_STAGES),
        status: r.optEnum("status", LEAD_STATUSES),
        priority: r.optEnum("priority", LEAD_PRIORITIES),
        executiveId:
          r.optStr("executiveId") === undefined
            ? undefined
            : asUserId(r.str("executiveId")),
        anyFieldSearch: r.optStr("anyFieldSearch") ?? undefined,
        updatedSinceMs: r.optNum("updatedSinceMs") ?? undefined,
        updatedUntilMs: r.optNum("updatedUntilMs") ?? undefined,
        sortBy: r.optEnum("sortBy", SORT_FIELDS),
        sortDirection: r.optEnum("sortDirection", SORT_DIRECTIONS),
        limit: r.optNum("limit") ?? undefined,
        offset: r.optNum("offset") ?? undefined,
      })),

    audit: ({ stage, status }) => ({
      stage: stage ?? null,
      status: status ?? null,
    }),

    execute: ({ actor }, parsedFilters) => {
      const workflow = getServerRuntime().workflow;
      const { userId, role, branchId } = workflowActor(actor);

      return listLeads(
        { leads: workflow.repos.leadQueries },
        {
          actorUserId: userId,
          actorRole: role,
          actorBranchId: branchId,
          filters: parsedFilters,
        },
      );
    },
  });
}

export async function queryLeadDetail(
  rawLeadId: string,
): Promise<LeadDetailView> {
  return runAction({
    name: "workflow.get_lead_detail",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ leadId: rawLeadId }, validationFail, (r) => ({
        leadId: asWorkflowLeadId(r.str("leadId")),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, query) => {
      const workflow = getServerRuntime().workflow;
      const { userId, role } = workflowActor(actor);

      return getLeadDetail(workflow.repos, {
        actorUserId: userId,
        actorRole: role,
        leadId: query.leadId,
      });
    },
  });
}

export async function queryFulfillmentQueue(): Promise<FulfillmentQueueView> {
  return runAction({
    name: "workflow.list_fulfillment_queue",
    access: { kind: "auth" },

    execute: ({ actor }) => {
      const { role, branchId } = workflowActor(actor);
      return listFulfillmentQueue(
        getServerRuntime().workflow.ports().executor,
        { actorRole: role, actorBranchId: branchId },
      );
    },
  });
}

export async function queryPendingQuotationCount(): Promise<PendingQuotationCountView> {
  return runAction({
    name: "workflow.pending_quotation_count",
    access: { kind: "auth" },

    execute: ({ actor }) => {
      const ports = getServerRuntime().workflow.ports();
      const { userId } = workflowActor(actor);
      const repos = createWorkflowRepos(ports.executor);

      return repos.leads
        .countPendingQuotationDecisions(userId, ports.now)
        .then((count) => Ok({ count, limit: MAX_PENDING_QUOTATION_DECISIONS }));
    },
  });
}

export async function queryLeadBootstrapPreview(
  rawRuc: string,
): Promise<LeadBootstrapPreviewView> {
  return runAction({
    name: "workflow.get_lead_bootstrap_preview",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ ruc: rawRuc }, validationFail, (r) => ({
        ruc: r.str("ruc"),
      })),

    audit: ({ ruc }) => ({ ruc }),

    execute: (_ctx, query) => {
      const workflow = getServerRuntime().workflow;

      return getLeadBootstrapPreview(
        { party: workflow.repos.party },
        workflow.organizationEnrichment,
        { ruc: query.ruc },
      );
    },
  });
}

export async function queryAssignableExecutives(
  input: ListAssignableExecutivesInput,
): Promise<AssignableExecutiveView[]> {
  return runAction({
    name: "workflow.list_assignable_executives",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: asWorkflowLeadId(r.str("leadId")),
        search: r.optStr("search") ?? undefined,
        limit: r.optNum("limit") ?? undefined,
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, query) => {
      const workflow = getServerRuntime().workflow;
      const { userId, role, branchId } = workflowActor(actor);

      return listAssignableExecutives(workflow.repos, {
        actorUserId: userId,
        actorRole: role,
        actorBranchId: branchId,
        ...query,
      });
    },
  });
}
