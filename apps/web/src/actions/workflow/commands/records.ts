"use server";

import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import {
  type ReassignLeadCommandInput,
  type RegisterLeadCommandInput,
} from "~/server/workflow/types";
import {
  parseLeadReviewInput,
  parseRecordRepLegalInput,
  parseRequestQuotationInput,
  parseSaveCommercialScopeInput,
  parseSaveDigitalPolicyInput,
} from "./input";
export type CreateLeadInput = {
  ruc: string;
  executiveId?: number;
};

export type ReassignLeadInput = {
  leadId: string;
  newExecutiveId: number;
};

export async function requestLeadCreation(input: CreateLeadInput) {
  return runAction({
    actionName: "workflow.register_lead",
    access: { kind: "auth" },
    input,

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.registerLead({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        ruc: input.ruc,
        executiveId: input.executiveId ?? actor.userId,
      } satisfies RegisterLeadCommandInput),
  });
}

export async function requestLeadReview(input: unknown) {
  return runAction({
    actionName: "workflow.review_lead",
    access: { kind: "auth" },
    input,

    execute: async ({ actor }) => {
      const parsedInput = parseLeadReviewInput(input);
      if (!parsedInput.ok) return parsedInput;

      return getServerRuntime().workflow.commands.reviewLead({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: parsedInput.value.leadId,
        status: parsedInput.value.status,
        prioridad: parsedInput.value.prioridad,
        reason: parsedInput.value.reason,
      });
    },
  });
}

export async function requestSaveCommercialScope(
  input: unknown,
) {
  return runAction({
    actionName: "workflow.save_commercial_scope",
    access: { kind: "auth" },
    input,

    execute: async ({ actor }) => {
      const parsedInput = parseSaveCommercialScopeInput(input);
      if (!parsedInput.ok) return parsedInput;

      return getServerRuntime().workflow.commands.saveCommercialScope({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: parsedInput.value.leadId,
        proveedorActual: parsedInput.value.proveedorActual,
        tasaActual: parsedInput.value.tasaActual,
        gpv: parsedInput.value.gpv,
        ticket: parsedInput.value.ticket,
        giroNegocio: parsedInput.value.giroNegocio,
        abonoBank: parsedInput.value.abonoBank,
        posTotal: parsedInput.value.posTotal,
      });
    },
  });
}

export async function requestQuotation(input: unknown) {
  return runAction({
    actionName: "workflow.request_quotation",
    access: { kind: "auth" },
    input,

    execute: async ({ actor }) => {
      const parsedInput = parseRequestQuotationInput(input);
      if (!parsedInput.ok) return parsedInput;

      return getServerRuntime().workflow.commands.requestQuotation({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: parsedInput.value.leadId,
        proveedorActual: parsedInput.value.proveedorActual,
        tasaActual: parsedInput.value.tasaActual,
        gpv: parsedInput.value.gpv,
        ticket: parsedInput.value.ticket,
        giroNegocio: parsedInput.value.giroNegocio,
        abonoBank: parsedInput.value.abonoBank,
        posTotal: parsedInput.value.posTotal,
      });
    },
  });
}

export async function requestSaveDigitalPolicy(input: unknown) {
  return runAction({
    actionName: "workflow.save_digital_policy",
    access: { kind: "auth" },
    input,

    execute: async ({ actor }) => {
      const parsedInput = parseSaveDigitalPolicyInput(input);
      if (!parsedInput.ok) return parsedInput;

      return getServerRuntime().workflow.commands.saveDigitalPolicy({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: parsedInput.value.leadId,
        linkScope: parsedInput.value.linkScope,
        linkUrl: parsedInput.value.linkUrl,
        onlineScope: parsedInput.value.onlineScope,
        onlineUrl: parsedInput.value.onlineUrl,
        onlineModalidad: parsedInput.value.onlineModalidad,
      });
    },
  });
}

export async function requestRecordRepLegal(input: unknown) {
  return runAction({
    actionName: "workflow.record_rep_legal",
    access: { kind: "auth" },
    input,

    execute: async ({ actor }) => {
      const parsedInput = parseRecordRepLegalInput(input);
      if (!parsedInput.ok) return parsedInput;

      return getServerRuntime().workflow.commands.recordRepLegal({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: parsedInput.value.leadId,
        nombres: parsedInput.value.nombres,
        apellidoPaterno: parsedInput.value.apellidoPaterno,
        apellidoMaterno: parsedInput.value.apellidoMaterno,
        dni: parsedInput.value.dni,
        telefono: parsedInput.value.telefono,
        email: parsedInput.value.email,
      });
    },
  });
}

export async function requestStartSetupExecution(input: { leadId: string }) {
  return runAction({
    actionName: "workflow.start_setup_execution",
    access: { kind: "auth" },
    input,

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.startSetupExecution({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
      }),
  });
}

export async function requestLeadReassignment(input: ReassignLeadInput) {
  return runAction({
    actionName: "workflow.reassign_lead",
    access: { kind: "auth" },
    input,

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.reassignLead({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        toExecutiveId: input.newExecutiveId,
      } satisfies ReassignLeadCommandInput),
  });
}

export async function requestAddLeadToFavorites(input: { leadId: string }) {
  return runAction({
    actionName: "workflow.add_lead_to_favorites",
    access: { kind: "auth" },
    input,

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.addToFavorites({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
      }),
  });
}

export async function requestRemoveLeadFromFavorites(input: {
  leadId: string;
}) {
  return runAction({
    actionName: "workflow.remove_lead_from_favorites",
    access: { kind: "auth" },
    input,

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.removeFromFavorites({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
      }),
  });
}

export async function requestLeadSunatRefresh(input: { leadId: string }) {
  return runAction({
    actionName: "workflow.request_sunat_refresh",
    access: { kind: "auth" },
    input,

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.requestSunatRefresh({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
      }),
  });
}
