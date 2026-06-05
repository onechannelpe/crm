"use server";

import type {
  AbonoBank,
  ModalidadCobro,
  ProductScope,
} from "~/contracts/workflow/vocabulary";
import { validationError } from "~/lib/app-errors";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import {
  parseRequiredLeadPriority,
  parseRequiredLeadStatus,
  parseRequiredLeadText,
} from "~/server/workflow/parsers";
import {
  type ReassignLeadCommandInput,
  type RegisterLeadCommandInput,
} from "~/server/workflow/types";

export type CreateLeadInput = {
  ruc: string;
  executiveId?: number;
};

export type LeadReviewInput = {
  leadId: string;
  status: string;
  prioridad: string;
  reason: string;
};

export type SaveCommercialScopeInput = {
  leadId: string;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  giroNegocio: string;
  abonoBank: AbonoBank;
  posTotal: number;
};

export type RequestQuotationInput = {
  leadId: string;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  giroNegocio: string;
  abonoBank: AbonoBank;
  posTotal: number;
};

export type SaveDigitalPolicyInput = {
  leadId: string;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
};

export type RecordRepLegalInput = {
  leadId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string;
  email: string;
};

export type ReassignLeadInput = {
  leadId: string;
  newExecutiveId: number;
};

function assertParsed<T>(
  parsed: { ok: true; value: T } | { ok: false; error: { message: string } },
): T {
  if (!parsed.ok) {
    throw validationError(parsed.error.message);
  }
  return parsed.value;
}

function parseCommercialScope(input: {
  proveedorActual: string;
  giroNegocio: string;
}) {
  const proveedorActual = parseRequiredLeadText(
    input.proveedorActual,
    "proveedor_actual_required",
    "Proveedor actual is required",
  );

  if (!proveedorActual.ok) {
    return proveedorActual;
  }

  const giroNegocio = parseRequiredLeadText(
    input.giroNegocio,
    "giro_negocio_required",
    "Giro de negocio is required",
  );

  if (!giroNegocio.ok) {
    return giroNegocio;
  }

  return {
    ok: true,
    value: {
      proveedorActual: proveedorActual.value,
      giroNegocio: giroNegocio.value,
    },
  } as const;
}

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

export async function requestLeadReview(input: LeadReviewInput) {
  const status = assertParsed(parseRequiredLeadStatus(input.status));
  const prioridad = assertParsed(parseRequiredLeadPriority(input.prioridad));
  const reason = assertParsed(
    parseRequiredLeadText(
      input.reason,
      "review_reason_required",
      "Reason is required",
    ),
  );

  return runAction({
    actionName: "workflow.review_lead",
    access: { kind: "auth" },
    input: { leadId: input.leadId },

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.reviewLead({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        status,
        prioridad,
        reason,
      }),
  });
}

export async function requestSaveCommercialScope(
  input: SaveCommercialScopeInput,
) {
  const commercialScope = assertParsed(parseCommercialScope(input));

  return runAction({
    actionName: "workflow.save_commercial_scope",
    access: { kind: "auth" },
    input: { leadId: input.leadId },

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.saveCommercialScope({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        proveedorActual: commercialScope.proveedorActual,
        tasaActual: input.tasaActual,
        gpv: input.gpv,
        ticket: input.ticket,
        giroNegocio: commercialScope.giroNegocio,
        abonoBank: input.abonoBank,
        posTotal: input.posTotal,
      }),
  });
}

export async function requestQuotation(input: RequestQuotationInput) {
  const commercialScope = assertParsed(parseCommercialScope(input));

  return runAction({
    actionName: "workflow.request_quotation",
    access: { kind: "auth" },
    input: { leadId: input.leadId },

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.requestQuotation({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        proveedorActual: commercialScope.proveedorActual,
        tasaActual: input.tasaActual,
        gpv: input.gpv,
        ticket: input.ticket,
        giroNegocio: commercialScope.giroNegocio,
        abonoBank: input.abonoBank,
        posTotal: input.posTotal,
      }),
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
  const nombres = assertParsed(
    parseRequiredLeadText(
      input.nombres,
      "nombres_required",
      "Nombres is required",
    ),
  );
  const apellidoPaterno = assertParsed(
    parseRequiredLeadText(
      input.apellidoPaterno,
      "apellido_paterno_required",
      "Apellido paterno is required",
    ),
  );
  const apellidoMaterno = assertParsed(
    parseRequiredLeadText(
      input.apellidoMaterno,
      "apellido_materno_required",
      "Apellido materno is required",
    ),
  );
  const dni = assertParsed(
    parseRequiredLeadText(input.dni, "dni_required", "DNI is required"),
  );
  const telefono = assertParsed(
    parseRequiredLeadText(
      input.telefono,
      "telefono_required",
      "Telefono is required",
    ),
  );
  const email = assertParsed(
    parseRequiredLeadText(input.email, "email_required", "Email is required"),
  );

  return runAction({
    actionName: "workflow.record_rep_legal",
    access: { kind: "auth" },
    input: { leadId: input.leadId },

    execute: ({ actor }) =>
      getServerRuntime().workflow.commands.recordRepLegal({
        actor: {
          userId: actor.userId,
          role: actor.role,
          branchId: actor.branchId,
        },
        leadId: input.leadId,
        nombres,
        apellidoPaterno,
        apellidoMaterno,
        dni,
        telefono,
        email,
      }),
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
