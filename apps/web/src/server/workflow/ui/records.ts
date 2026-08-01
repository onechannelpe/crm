import "server-only";
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
import { workflowActor } from "~/server/workflow/ui/actor";
import { workflow } from "~/server/workflow/ui/composition";
import { isErr, Ok } from "~/shared/result";

const SORT_FIELDS = ["createdAt", "updatedAt", "registeredBy", "ruc"] as const;
const SORT_DIRECTIONS = ["asc", "desc"] as const;
export async function queryLeadList(
  filters: ListLeadsFiltersInput,
): Promise<LeadListView> {
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

    execute: ({ actor, operationAt: now }, parsedFilters) => {
      const { userId, role, branchId } = workflowActor(actor);

      return workflow.queries.listLeads({
        actorUserId: userId,
        actorRole: role,
        actorBranchId: branchId,
        filters: parsedFilters,
        evaluatedAt: now,
      });
    },
  });
}

export async function queryLeadDetail(
  rawLeadId: string,
): Promise<LeadDetailView & { evaluatedAt: number }> {
  return executeSessionServerFunction({
    name: "workflow.get_lead_detail",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ leadId: rawLeadId }, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: async ({ actor, operationAt: now }, query) => {
      const { userId, role } = workflowActor(actor);

      const detail = await workflow.queries.getLeadDetail({
        actorUserId: userId,
        actorRole: role,
        leadId: query.leadId,
        evaluatedAt: now,
      });
      if (isErr(detail)) return detail;

      return Ok({
        ...detail.value,
        evaluatedAt: now.getTime(),
      });
    },
  });
}

export async function queryFulfillmentQueue(): Promise<
  FulfillmentQueueView & { evaluatedAt: number }
> {
  return executeSessionServerFunction({
    name: "workflow.list_fulfillment_queue",
    access: { kind: "auth" },

    execute: async ({ actor, operationAt: now }) => {
      const { role, branchId } = workflowActor(actor);
      const queue = await workflow.queries.listFulfillmentQueue({
        actorRole: role,
        actorBranchId: branchId,
      });
      if (isErr(queue)) return queue;

      return Ok({
        ...queue.value,
        evaluatedAt: now.getTime(),
      });
    },
  });
}

export async function queryPendingQuotationCount(): Promise<PendingQuotationCountView> {
  return executeSessionServerFunction({
    name: "workflow.pending_quotation_count",
    access: { kind: "auth" },

    execute: ({ actor, operationAt: now }) => {
      const { userId, branchId } = workflowActor(actor);

      return workflow.queries
        .pendingQuotationCount(userId, branchId, now)
        .then(Ok);
    },
  });
}

export async function queryLeadBootstrapPreview(
  rawRuc: string,
): Promise<LeadBootstrapPreviewView> {
  return executeSessionServerFunction({
    name: "workflow.get_lead_bootstrap_preview",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ ruc: rawRuc }, validationFail, (r) => ({
        ruc: r.str("ruc"),
      })),

    audit: ({ ruc }) => ({ ruc }),

    execute: (_ctx, query) => workflow.queries.getLeadBootstrapPreview(query),
  });
}

export async function queryAssignableExecutives(
  input: ListAssignableExecutivesInput,
): Promise<AssignableExecutiveView[]> {
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

      return workflow.queries.listAssignableExecutives({
        actorUserId: userId,
        actorRole: role,
        actorBranchId: branchId,
        ...query,
      });
    },
  });
}
