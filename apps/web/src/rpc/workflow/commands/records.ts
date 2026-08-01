import {
  SETTLEMENT_BANKS,
  COLLECTION_MODES,
  PRODUCT_SCOPES,
  LEAD_STATUSES,
  LEAD_PRIORITIES,
} from "~/contracts/workflow/vocabulary";
import { UserId, WorkflowInquiryId, WorkflowLeadId } from "~/domain/ids";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { workflowActor } from "~/server/workflow/ui/actor";
import { workflow } from "~/server/workflow/ui/composition";
import { isErr, Ok } from "~/shared/result";

function parseLeadRef(input: unknown) {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.id("leadId", WorkflowLeadId),
  }));
}

export async function requestLeadCreation(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.register_lead",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        ruc: r.str("ruc"),
        inquiryId: r.optId("inquiryId", WorkflowInquiryId),
        currentProvider: r.str("currentProvider"),
        currentDebitRate: r.num("currentDebitRate"),
        currentCreditRate: r.num("currentCreditRate"),
        gpv: r.num("gpv"),
        ticket: r.num("ticket"),
        lineOfBusiness: r.str("lineOfBusiness"),
        settlementBank: r.enum("settlementBank", SETTLEMENT_BANKS),
        posCount: r.posInt("posCount"),
      })),

    execute: ({ actor, operationAt: now }, payload) =>
      workflow.commands.registerLead(
        { actor: workflowActor(actor), ...payload },
        now,
      ),
  });
}

export async function requestEditCommercialScope(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.edit_commercial_scope",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        currentProvider: r.str("currentProvider"),
        currentDebitRate: r.num("currentDebitRate"),
        currentCreditRate: r.num("currentCreditRate"),
        gpv: r.num("gpv"),
        ticket: r.num("ticket"),
        lineOfBusiness: r.str("lineOfBusiness"),
        settlementBank: r.enum("settlementBank", SETTLEMENT_BANKS),
        posCount: r.posInt("posCount"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor, operationAt: now }, payload) =>
      workflow.commands.editCommercialScope(
        { actor: workflowActor(actor), ...payload },
        now,
      ),
  });
}

export async function requestSaveDigitalPolicy(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.save_digital_policy",
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

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor, operationAt: now }, payload) =>
      workflow.commands.saveDigitalPolicy(
        { actor: workflowActor(actor), ...payload },
        now,
      ),
  });
}

export async function requestRecordRepLegal(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.record_rep_legal",
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

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor, operationAt: now }, payload) =>
      workflow.commands.recordRepLegal(
        { actor: workflowActor(actor), ...payload },
        now,
      ),
  });
}

export async function requestLeadReview(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.review_lead",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        status: r.enum("status", LEAD_STATUSES),
        priority: r.enum("priority", LEAD_PRIORITIES),
        reason: r.str("reason"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor, operationAt: now }, payload) =>
      workflow.commands.reviewLead(
        { actor: workflowActor(actor), ...payload },
        now,
      ),
  });
}

export async function requestQuotationRestart(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.restart_quotation",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor, operationAt: now }, { leadId }) =>
      workflow.commands.restartQuotation(
        { actor: workflowActor(actor), leadId },
        now,
      ),
  });
}

export async function requestLeadReassignment(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.reassign_lead",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.id("leadId", WorkflowLeadId),
        newExecutiveId: r.id("newExecutiveId", UserId),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor, operationAt: now }, payload) =>
      workflow.commands.reassignLead(
        {
          actor: workflowActor(actor),
          leadId: payload.leadId,
          toExecutiveId: payload.newExecutiveId,
        },
        now,
      ),
  });
}

export async function requestAddLeadToFavorites(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.add_lead_to_favorites",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    audit: ({ leadId }) => ({ leadId }),

    execute: async ({ actor, operationAt: now }, { leadId }) => {
      const result = await workflow.commands.addToFavorites(
        {
          actor: workflowActor(actor),
          leadId,
        },
        now,
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
    name: "workflow.remove_lead_from_favorites",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    audit: ({ leadId }) => ({ leadId }),

    execute: async ({ actor, operationAt: now }, { leadId }) => {
      const result = await workflow.commands.removeFromFavorites(
        {
          actor: workflowActor(actor),
          leadId,
        },
        now,
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
    name: "workflow.delete_lead",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor, operationAt: now }, { leadId }) =>
      workflow.commands.deleteLead(
        {
          actor: workflowActor(actor),
          leadId,
        },
        now,
      ),
  });
}

export async function requestLeadSunatRefresh(input: unknown) {
  "use server";

  return executeSessionServerFunction({
    name: "workflow.request_sunat_refresh",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor, operationAt: now }, { leadId }) =>
      workflow.commands.requestSunatRefresh(
        {
          actor: workflowActor(actor),
          leadId,
        },
        now,
      ),
  });
}
