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
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { workflowActor } from "~/server/workflow/ui/actor";
import { isErr, Ok } from "~/shared/result";

const SORT_FIELDS = ["createdAt", "updatedAt", "registeredBy", "ruc"] as const;
const SORT_DIRECTIONS = ["asc", "desc"] as const;
export async function queryLeadList(
  filters: ListLeadsFiltersInput,
): Promise<LeadListView> {
  return executeSessionServerFunction({
    name: "application.workflow.list_leads",
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

    telemetry: ({ stage, status }) => ({
      stage: stage ?? null,
      status: status ?? null,
    }),

    execute: (ctx, parsedFilters) => {
      const { userId, role, branchId } = workflowActor(ctx.actor);

      return application.workflow.queries.listLeads(
        {
          actorUserId: userId,
          actorRole: role,
          actorBranchId: branchId,
          filters: parsedFilters,
        },
        ctx,
      );
    },
  });
}

export async function queryLeadDetail(
  rawLeadId: string,
): Promise<LeadDetailView & { evaluatedAt: number }> {
  return executeSessionServerFunction({
    name: "application.workflow.get_lead_detail",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ leadId: rawLeadId }, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
      })),

    telemetry: ({ leadId }) => ({ leadId }),

    execute: async (ctx, query) => {
      const { userId, role } = workflowActor(ctx.actor);

      const detail = await application.workflow.queries.getLeadDetail(
        {
          actorUserId: userId,
          actorRole: role,
          leadId: query.leadId,
        },
        ctx,
      );
      if (isErr(detail)) return detail;

      return Ok({
        ...detail.value,
        evaluatedAt: ctx.operationAt.getTime(),
      });
    },
  });
}

export async function queryFulfillmentQueue(): Promise<
  FulfillmentQueueView & { evaluatedAt: number }
> {
  return executeSessionServerFunction({
    name: "application.workflow.list_fulfillment_queue",
    access: { kind: "auth" },

    execute: async (ctx) => {
      const { role, branchId } = workflowActor(ctx.actor);
      const queue = await application.workflow.queries.listFulfillmentQueue({
        actorRole: role,
        actorBranchId: branchId,
      });
      if (isErr(queue)) return queue;

      return Ok({
        ...queue.value,
        evaluatedAt: ctx.operationAt.getTime(),
      });
    },
  });
}

export async function queryPendingQuotationCount(): Promise<PendingQuotationCountView> {
  return executeSessionServerFunction({
    name: "application.workflow.pending_quotation_count",
    access: { kind: "auth" },

    execute: (ctx) => {
      const { userId, branchId } = workflowActor(ctx.actor);

      return application.workflow.queries
        .pendingQuotationCount(userId, branchId, ctx)
        .then(Ok);
    },
  });
}

export async function queryLeadBootstrapPreview(
  rawRuc: string,
): Promise<LeadBootstrapPreviewView> {
  return executeSessionServerFunction({
    name: "application.workflow.get_lead_bootstrap_preview",
    access: { kind: "auth" },

    parse: () =>
      parseObject({ ruc: rawRuc }, validationFail, (r) => ({
        ruc: r.str("ruc"),
      })),

    telemetry: ({ ruc }) => ({ ruc }),

    execute: (_ctx, query) =>
      application.workflow.queries.getLeadBootstrapPreview(query),
  });
}

export async function queryAssignableExecutives(
  input: ListAssignableExecutivesInput,
): Promise<AssignableExecutiveView[]> {
  return executeSessionServerFunction({
    name: "application.workflow.list_assignable_executives",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        search: r.optStr("search") ?? undefined,
        limit: r.optNum("limit") ?? undefined,
      })),

    telemetry: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, query) => {
      const { userId, role, branchId } = workflowActor(actor);

      return application.workflow.queries.listAssignableExecutives({
        actorUserId: userId,
        actorRole: role,
        actorBranchId: branchId,
        ...query,
      });
    },
  });
}
