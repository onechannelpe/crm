"use server";

import {
  type CreateLeadInput,
  type LeadReviewInput,
  type RecordRepLegalInput,
  type ReassignLeadInput,
  type RequestQuotationInput,
  type SaveCommercialScopeInput,
  type SaveDigitalPolicyInput,
} from "~/contracts/workflow/inputs";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import {
  parseRequiredLeadPriority,
  parseRequiredLeadStatus,
  parseRequiredLeadText,
} from "~/server/workflow/parsers";
import {
  type ReassignLeadCommandInput,
  type RegisterLeadInput,
} from "~/server/workflow/types";

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
      } satisfies RegisterLeadInput),
  });
}

export async function requestLeadReview(input: LeadReviewInput) {
  return runAction({
    actionName: "workflow.review_lead",
    access: { kind: "auth" },
    input: { leadId: input.leadId },

    execute: async ({ actor }) => {
      const status = parseRequiredLeadStatus(input.status);
      if (!status.ok) return status;
      const prioridad = parseRequiredLeadPriority(input.prioridad);
      if (!prioridad.ok) return prioridad;
      const reason = parseRequiredLeadText(
        input.reason,
        "review_reason_required",
        "Reason is required",
      );
      if (!reason.ok) return reason;

      return getServerRuntime().workflow.commands.reviewLead({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        status: status.value,
        prioridad: prioridad.value,
        reason: reason.value,
      });
    },
  });
}

export async function requestSaveCommercialScope(
  input: SaveCommercialScopeInput,
) {
  return runAction({
    actionName: "workflow.save_commercial_scope",
    access: { kind: "auth" },
    input: { leadId: input.leadId },

    execute: async ({ actor }) => {
      const proveedorActual = parseRequiredLeadText(
        input.proveedorActual,
        "proveedor_actual_required",
        "Proveedor actual is required",
      );
      if (!proveedorActual.ok) return proveedorActual;
      const giroNegocio = parseRequiredLeadText(
        input.giroNegocio,
        "giro_negocio_required",
        "Giro de negocio is required",
      );
      if (!giroNegocio.ok) return giroNegocio;

      return getServerRuntime().workflow.commands.saveCommercialScope({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        proveedorActual: proveedorActual.value,
        tasaActual: input.tasaActual,
        gpv: input.gpv,
        ticket: input.ticket,
        giroNegocio: giroNegocio.value,
        abonoBank: input.abonoBank,
        posTotal: input.posTotal,
      });
    },
  });
}

export async function requestQuotation(input: RequestQuotationInput) {
  return runAction({
    actionName: "workflow.request_quotation",
    access: { kind: "auth" },
    input: { leadId: input.leadId },

    execute: async ({ actor }) => {
      const proveedorActual = parseRequiredLeadText(
        input.proveedorActual,
        "proveedor_actual_required",
        "Proveedor actual is required",
      );
      if (!proveedorActual.ok) return proveedorActual;
      const giroNegocio = parseRequiredLeadText(
        input.giroNegocio,
        "giro_negocio_required",
        "Giro de negocio is required",
      );
      if (!giroNegocio.ok) return giroNegocio;

      return getServerRuntime().workflow.commands.requestQuotation({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        proveedorActual: proveedorActual.value,
        tasaActual: input.tasaActual,
        gpv: input.gpv,
        ticket: input.ticket,
        giroNegocio: giroNegocio.value,
        abonoBank: input.abonoBank,
        posTotal: input.posTotal,
      });
    },
  });
}

export async function requestSaveDigitalPolicy(input: SaveDigitalPolicyInput) {
  return runAction({
    actionName: "workflow.save_digital_policy",
    access: { kind: "auth" },
    input: { leadId: input.leadId },

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.saveDigitalPolicy({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        ...input,
      }),
  });
}

export async function requestRecordRepLegal(input: RecordRepLegalInput) {
  return runAction({
    actionName: "workflow.record_rep_legal",
    access: { kind: "auth" },
    input: { leadId: input.leadId },

    execute: async ({ actor }) => {
      const nombres = parseRequiredLeadText(
        input.nombres,
        "nombres_required",
        "Nombres is required",
      );
      if (!nombres.ok) return nombres;
      const apellidoPaterno = parseRequiredLeadText(
        input.apellidoPaterno,
        "apellido_paterno_required",
        "Apellido paterno is required",
      );
      if (!apellidoPaterno.ok) return apellidoPaterno;
      const apellidoMaterno = parseRequiredLeadText(
        input.apellidoMaterno,
        "apellido_materno_required",
        "Apellido materno is required",
      );
      if (!apellidoMaterno.ok) return apellidoMaterno;
      const dni = parseRequiredLeadText(
        input.dni,
        "dni_required",
        "DNI is required",
      );
      if (!dni.ok) return dni;
      const telefono = parseRequiredLeadText(
        input.telefono,
        "telefono_required",
        "Telefono is required",
      );
      if (!telefono.ok) return telefono;
      const email = parseRequiredLeadText(
        input.email,
        "email_required",
        "Email is required",
      );
      if (!email.ok) return email;

      return getServerRuntime().workflow.commands.recordRepLegal({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        nombres: nombres.value,
        apellidoPaterno: apellidoPaterno.value,
        apellidoMaterno: apellidoMaterno.value,
        dni: dni.value,
        telefono: telefono.value,
        email: email.value,
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
