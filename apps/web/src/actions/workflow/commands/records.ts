"use server";

import {
  SETTLEMENT_BANKS,
  COLLECTION_MODES,
  PRODUCT_SCOPES,
} from "~/contracts/workflow/vocabulary";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { isErr, Ok } from "~/server/shared/result";

import { workflowActor } from "./actor";

function parseLeadRef(input: unknown) {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
  }));
}

function parseCommercialScope(input: unknown) {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
    currentProvider: r.str("currentProvider"),
    currentDebitRate: r.num("currentDebitRate"),
    currentCreditRate: r.num("currentCreditRate"),
    gpv: r.num("gpv"),
    ticket: r.num("ticket"),
    giroNegocio: r.str("giroNegocio"),
    settlementBank: r.enum("settlementBank", SETTLEMENT_BANKS),
    posCount: r.num("posCount"),
  }));
}

export async function requestLeadCreation(input: unknown) {
  return runAction({
    name: "workflow.register_lead",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        ruc: r.str("ruc"),
        currentProvider: r.str("currentProvider"),
        currentDebitRate: r.num("currentDebitRate"),
        currentCreditRate: r.num("currentCreditRate"),
        gpv: r.num("gpv"),
        ticket: r.num("ticket"),
        giroNegocio: r.str("giroNegocio"),
        settlementBank: r.enum("settlementBank", SETTLEMENT_BANKS),
        posCount: r.num("posCount"),
      })),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.registerLead({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestEditCommercialScope(input: unknown) {
  return runAction({
    name: "workflow.edit_commercial_scope",
    access: { kind: "auth" },
    parse: () => parseCommercialScope(input),
    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.editCommercialScope({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestSaveDigitalPolicy(input: unknown) {
  return runAction({
    name: "workflow.save_digital_policy",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        linkScope: r.enum("linkScope", PRODUCT_SCOPES),
        linkUrl: r.optStr("linkUrl") ?? null,
        onlineScope: r.enum("onlineScope", PRODUCT_SCOPES),
        onlineUrl: r.optStr("onlineUrl") ?? null,
        onlineCollectionMode:
          r.optEnum("onlineCollectionMode", COLLECTION_MODES) ?? null,
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.saveDigitalPolicy({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestRecordRepLegal(input: unknown) {
  return runAction({
    name: "workflow.record_rep_legal",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        nombres: r.str("nombres"),
        apellidoPaterno: r.str("apellidoPaterno"),
        apellidoMaterno: r.str("apellidoMaterno"),
        dni: r.str("dni"),
        telefono: r.str("telefono"),
        email: r.str("email"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.recordRepLegal({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestLeadReassignment(input: unknown) {
  return runAction({
    name: "workflow.reassign_lead",
    access: { kind: "auth" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        leadId: r.str("leadId"),
        newExecutiveId: r.num("newExecutiveId"),
      })),

    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.reassignLead({
        actor: workflowActor(actor),
        leadId: payload.leadId,
        toExecutiveId: payload.newExecutiveId,
      }),
  });
}

export async function requestAddLeadToFavorites(input: unknown) {
  return runAction({
    name: "workflow.add_lead_to_favorites",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    audit: ({ leadId }) => ({ leadId }),

    execute: async ({ actor }, { leadId }) => {
      const result = await getServerRuntime().workflow.commands.addToFavorites({
        actor: workflowActor(actor),
        leadId,
      });

      if (isErr(result)) {
        return result;
      }

      return Ok({ message: "Empresa agregada a favoritos" });
    },
  });
}

export async function requestRemoveLeadFromFavorites(input: unknown) {
  return runAction({
    name: "workflow.remove_lead_from_favorites",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    audit: ({ leadId }) => ({ leadId }),

    execute: async ({ actor }, { leadId }) => {
      const result =
        await getServerRuntime().workflow.commands.removeFromFavorites({
          actor: workflowActor(actor),
          leadId,
        });

      if (isErr(result)) {
        return result;
      }

      return Ok({ message: "Empresa quitada de favoritos" });
    },
  });
}

export async function requestLeadDeletion(input: unknown) {
  return runAction({
    name: "workflow.delete_lead",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, { leadId }) =>
      getServerRuntime().workflow.commands.deleteLead({
        actor: workflowActor(actor),
        leadId,
      }),
  });
}

export async function requestLeadSunatRefresh(input: unknown) {
  return runAction({
    name: "workflow.request_sunat_refresh",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    audit: ({ leadId }) => ({ leadId }),

    execute: ({ actor }, { leadId }) =>
      getServerRuntime().workflow.commands.requestSunatRefresh({
        actor: workflowActor(actor),
        leadId,
      }),
  });
}
