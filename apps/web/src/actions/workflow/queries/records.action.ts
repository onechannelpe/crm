import {
  type ListAssignableExecutivesInput,
  type ListLeadsFiltersInput,
} from "~/contracts/workflow/inputs";
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
import { UserId, WorkflowLeadId } from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { db } from "~/server/platform/database/db";
import { resolvePendingQuotationPolicy } from "~/server/workflow/lead/domain/pending-quotation";
import { getLeadBootstrapPreview } from "~/server/workflow/lead/read/queries/get-lead-bootstrap-preview";
import { getLeadDetail } from "~/server/workflow/lead/read/queries/get-lead-detail";
import { listAssignableExecutives } from "~/server/workflow/lead/read/queries/list-assignable-executives";
import { listFulfillmentQueue } from "~/server/workflow/lead/read/queries/list-fulfillment-queue";
import { listLeads } from "~/server/workflow/lead/read/queries/list-leads";
import { createWorkflowRepos } from "~/server/workflow/repos";
import { isErr, Ok } from "~/shared/result";

import { workflowActor } from "../commands/actor.action";

const SORT_FIELDS = ["createdAt", "updatedAt", "registeredBy", "ruc"] as const;
const SORT_DIRECTIONS = ["asc", "desc"] as const;
const workflowRepos = createWorkflowRepos(db);

export async function queryLeadList(
  filters: ListLeadsFiltersInput,
): Promise<LeadListView> {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.list_leads",
    access: { kind: "auth" },

    parse: () =>
      parseObject(filters, validationFail, (r) => ({
        stage: r.optEnum("stage", LEAD_STAGES),
        status: r.optEnum("status", LEAD_STATUSES),
        priority: r.optEnum("priority", LEAD_PRIORITIES),
        executiveId: r.optId("executiveId", UserId),
        anyFieldSearch: r.optStr("anyFieldSearch") ?? undefined,
        updatedToday: r.optBool("updatedToday") ?? undefined,
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
      const { userId, role, branchId } = workflowActor(actor);

      return listLeads(
        { leads: workflowRepos.leadQueries },
        {
          actorUserId: userId,
          actorRole: role,
          actorBranchId: branchId,
          filters: parsedFilters,
          evaluatedAt: new Date(),
        },
      );
    },
  });
}

export async function queryLeadDetail(
  rawLeadId: string,
): Promise<LeadDetailView & { evaluatedAt: number }> {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.get_lead_detail",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ leadId: rawLeadId }, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: async ({ actor, now }, query) => {
      const { userId, role } = workflowActor(actor);

      const detail = await getLeadDetail(workflowRepos, {
        actorUserId: userId,
        actorRole: role,
        leadId: query.leadId,
      });
      if (isErr(detail)) return detail;

      return Ok({
        ...detail.value,
        evaluatedAt: now().getTime(),
      });
    },
  });
}

export async function queryFulfillmentQueue(): Promise<
  FulfillmentQueueView & { evaluatedAt: number }
> {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.list_fulfillment_queue",
    access: { kind: "auth" },

    execute: async ({ actor, now }) => {
      const { role, branchId } = workflowActor(actor);
      const queue = await listFulfillmentQueue(db, {
        actorRole: role,
        actorBranchId: branchId,
      });
      if (isErr(queue)) return queue;

      return Ok({
        ...queue.value,
        evaluatedAt: now().getTime(),
      });
    },
  });
}

export async function queryPendingQuotationCount(): Promise<PendingQuotationCountView> {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.pending_quotation_count",
    access: { kind: "auth" },

    execute: ({ actor }) => {
      const { userId, branchId } = workflowActor(actor);

      return Promise.all([
        workflowRepos.leads.countPendingQuotationDecisions(userId, new Date()),
        workflowRepos.pendingQuotationPolicies.findByBranchId(branchId),
      ]).then(([count, branchPolicy]) => {
        const { limit } = resolvePendingQuotationPolicy({ branchPolicy });
        return Ok({ count, limit });
      });
    },
  });
}

export async function queryLeadBootstrapPreview(
  rawRuc: string,
): Promise<LeadBootstrapPreviewView> {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.get_lead_bootstrap_preview",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ ruc: rawRuc }, validationFail, (r) => ({
        ruc: r.str("ruc"),
      })),

    audit: ({ ruc }) => ({ ruc }),

    execute: async (_ctx, query) => {
      const { getWorkflowRuntime } =
        await import("~/server/platform/container/workflow-runtime");
      const workflow = getWorkflowRuntime();

      return getLeadBootstrapPreview(
        { organization: workflow.repos.organization },
        workflow.organizationEnrichment,
        { ruc: query.ruc },
      );
    },
  });
}

export async function queryAssignableExecutives(
  input: ListAssignableExecutivesInput,
): Promise<AssignableExecutiveView[]> {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.list_assignable_executives",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        search: r.optStr("search") ?? undefined,
        limit: r.optNum("limit") ?? undefined,
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, query) => {
      const { userId, role, branchId } = workflowActor(actor);

      return listAssignableExecutives(workflowRepos, {
        actorUserId: userId,
        actorRole: role,
        actorBranchId: branchId,
        ...query,
      });
    },
  });
}
