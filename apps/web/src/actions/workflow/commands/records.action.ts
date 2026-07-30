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
import { addToFavoritesCommand } from "~/server/workflow/lead/commands/add-to-favorites";
import { deleteLeadCommand } from "~/server/workflow/lead/commands/delete-lead";
import { editCommercialScopeCommand } from "~/server/workflow/lead/commands/edit-commercial-scope";
import { reassignLeadCommand } from "~/server/workflow/lead/commands/reassign-lead";
import { recordRepLegalCommand } from "~/server/workflow/lead/commands/record-rep-legal";
import { registerLead } from "~/server/workflow/lead/commands/register-lead";
import { removeFromFavoritesCommand } from "~/server/workflow/lead/commands/remove-from-favorites";
import { requestSunatRefresh } from "~/server/workflow/lead/commands/request-sunat-refresh";
import { restartQuotationCommand } from "~/server/workflow/lead/commands/restart-quotation";
import { reviewLeadCommand } from "~/server/workflow/lead/commands/review-lead";
import { saveDigitalPolicyCommand } from "~/server/workflow/lead/digital-policy/write";
import { workflowActor } from "~/server/workflow/ui/actor";
import { composeWorkflow } from "~/server/workflow/ui/composition";
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

    execute: ({ actor }, payload) =>
      registerLead(
        { actor: workflowActor(actor), ...payload },
        {
          ...composeWorkflow().ports(),
          identity: composeWorkflow().organizationEnrichment,
        },
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

    execute: ({ actor }, payload) =>
      editCommercialScopeCommand(
        { actor: workflowActor(actor), ...payload },
        composeWorkflow().ports(),
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

    execute: ({ actor }, payload) =>
      saveDigitalPolicyCommand(
        { actor: workflowActor(actor), ...payload },
        composeWorkflow().ports(),
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

    execute: ({ actor }, payload) =>
      recordRepLegalCommand(
        { actor: workflowActor(actor), ...payload },
        composeWorkflow().ports(),
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

    execute: ({ actor }, payload) =>
      reviewLeadCommand(
        { actor: workflowActor(actor), ...payload },
        composeWorkflow().ports(),
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

    execute: ({ actor }, { leadId }) =>
      restartQuotationCommand(
        { actor: workflowActor(actor), leadId },
        composeWorkflow().ports(),
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

    execute: ({ actor }, payload) =>
      reassignLeadCommand(
        {
          actor: workflowActor(actor),
          leadId: payload.leadId,
          toExecutiveId: payload.newExecutiveId,
        },
        composeWorkflow().ports(),
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

    execute: async ({ actor }, { leadId }) => {
      const result = await addToFavoritesCommand(
        {
          actor: workflowActor(actor),
          leadId,
        },
        composeWorkflow().ports(),
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

    execute: async ({ actor }, { leadId }) => {
      const result = await removeFromFavoritesCommand(
        {
          actor: workflowActor(actor),
          leadId,
        },
        composeWorkflow().ports(),
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

    execute: ({ actor }, { leadId }) =>
      deleteLeadCommand(
        {
          actor: workflowActor(actor),
          leadId,
        },
        composeWorkflow().ports(),
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

    execute: ({ actor }, { leadId }) =>
      requestSunatRefresh(
        {
          actor: workflowActor(actor),
          leadId,
        },
        {
          leads: composeWorkflow().repos.leads,
          enrichmentQueue: composeWorkflow().enrichmentQueue,
        },
      ),
  });
}
