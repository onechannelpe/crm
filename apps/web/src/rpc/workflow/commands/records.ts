import { MIN_GPV } from "~/contracts/workflow/limits";
import {
  SETTLEMENT_BANKS,
  COLLECTION_MODES,
  PRODUCT_SCOPES,
  LEAD_STATUSES,
  LEAD_PRIORITIES,
} from "~/contracts/workflow/vocabulary";
import { UserId, WorkflowInquiryId, WorkflowLeadId } from "~/domain/ids";
import { getApplication } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { workflowActor } from "~/server/workflow/ui/actor";
import { isErr, Ok } from "~/shared/result";

function parseLeadRef(input: unknown) {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.id("leadId", WorkflowLeadId),
  }));
}

export async function requestLeadCreation(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "getApplication().workflow.register_lead",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        ruc: r.str("ruc"),
        inquiryId: r.optId("inquiryId", WorkflowInquiryId),
        currentProvider: r.str("currentProvider"),
        currentDebitRate: r.num("currentDebitRate"),
        currentCreditRate: r.num("currentCreditRate"),
        gpv: r.numAtLeast("gpv", MIN_GPV),
        ticket: r.num("ticket"),
        lineOfBusiness: r.str("lineOfBusiness"),
        settlementBank: r.enum("settlementBank", SETTLEMENT_BANKS),
        posCount: r.posInt("posCount"),
      })),

    execute: (ctx, payload) =>
      getApplication().workflow.commands.registerLead(
        { actor: workflowActor(ctx.actor), ...payload },
        ctx,
      ),
  });
}

export async function requestEditCommercialScope(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "getApplication().workflow.edit_commercial_scope",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        currentProvider: r.str("currentProvider"),
        currentDebitRate: r.num("currentDebitRate"),
        currentCreditRate: r.num("currentCreditRate"),
        gpv: r.numAtLeast("gpv", MIN_GPV),
        ticket: r.num("ticket"),
        lineOfBusiness: r.str("lineOfBusiness"),
        settlementBank: r.enum("settlementBank", SETTLEMENT_BANKS),
        posCount: r.posInt("posCount"),
      })),

    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, payload) =>
      getApplication().workflow.commands.editCommercialScope(
        { actor: workflowActor(ctx.actor), ...payload },
        ctx,
      ),
  });
}

export async function requestSaveDigitalPolicy(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "getApplication().workflow.save_digital_policy",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        linkScope: r.enum("linkScope", PRODUCT_SCOPES),
        linkUrl: r.optStr("linkUrl") ?? null,
        onlineScope: r.enum("onlineScope", PRODUCT_SCOPES),
        onlineUrl: r.optStr("onlineUrl") ?? null,
        onlineCollectionMode:
          r.optEnum("onlineCollectionMode", COLLECTION_MODES) ?? null,
      })),

    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, payload) =>
      getApplication().workflow.commands.saveDigitalPolicy(
        { actor: workflowActor(ctx.actor), ...payload },
        ctx,
      ),
  });
}

export async function requestRecordRepLegal(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "getApplication().workflow.record_rep_legal",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        nombres: r.str("nombres"),
        apellidoPaterno: r.str("apellidoPaterno"),
        apellidoMaterno: r.str("apellidoMaterno"),
        dni: r.str("dni"),
        telefono: r.str("telefono"),
        email: r.str("email"),
      })),

    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, payload) =>
      getApplication().workflow.commands.recordRepLegal(
        { actor: workflowActor(ctx.actor), ...payload },
        ctx,
      ),
  });
}

export async function requestLeadReview(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "getApplication().workflow.review_lead",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        status: r.enum("status", LEAD_STATUSES),
        priority: r.enum("priority", LEAD_PRIORITIES),
        reason: r.str("reason"),
      })),

    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, payload) =>
      getApplication().workflow.commands.reviewLead(
        { actor: workflowActor(ctx.actor), ...payload },
        ctx,
      ),
  });
}

export async function requestQuotationRestart(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "getApplication().workflow.restart_quotation",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, { leadId }) =>
      getApplication().workflow.commands.restartQuotation(
        { actor: workflowActor(ctx.actor), leadId },
        ctx,
      ),
  });
}

export async function requestLeadReassignment(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "getApplication().workflow.reassign_lead",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        newExecutiveId: r.id("newExecutiveId", UserId),
      })),

    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, payload) =>
      getApplication().workflow.commands.reassignLead(
        {
          actor: workflowActor(ctx.actor),
          leadId: payload.leadId,
          toExecutiveId: payload.newExecutiveId,
        },
        ctx,
      ),
  });
}

export async function requestAddLeadToFavorites(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "getApplication().workflow.add_lead_to_favorites",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    telemetry: ({ leadId }) => ({ leadId }),

    execute: async (ctx, { leadId }) => {
      const result = await getApplication().workflow.commands.addToFavorites(
        {
          actor: workflowActor(ctx.actor),
          leadId,
        },
        ctx,
      );

      if (isErr(result)) {
        return result;
      }

      return Ok({ message: "Empresa agregada a favoritos" });
    },
  });
}

export async function requestRemoveLeadFromFavorites(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "getApplication().workflow.remove_lead_from_favorites",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    telemetry: ({ leadId }) => ({ leadId }),

    execute: async (ctx, { leadId }) => {
      const result =
        await getApplication().workflow.commands.removeFromFavorites(
          {
            actor: workflowActor(ctx.actor),
            leadId,
          },
          ctx,
        );

      if (isErr(result)) {
        return result;
      }

      return Ok({ message: "Empresa quitada de favoritos" });
    },
  });
}

export async function requestLeadDeletion(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "getApplication().workflow.delete_lead",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, { leadId }) =>
      getApplication().workflow.commands.deleteLead(
        {
          actor: workflowActor(ctx.actor),
          leadId,
        },
        ctx,
      ),
  });
}

export async function requestLeadSunatRefresh(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "getApplication().workflow.request_sunat_refresh",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    telemetry: ({ leadId }) => ({ leadId }),

    execute: (ctx, { leadId }) =>
      getApplication().workflow.commands.requestSunatRefresh(
        {
          actor: workflowActor(ctx.actor),
          leadId,
        },
        ctx,
      ),
  });
}
