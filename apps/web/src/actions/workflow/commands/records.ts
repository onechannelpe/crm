"use server";

import { workflowActorFrom } from "~/actions/workflow/shared";
import { validationError } from "~/lib/app-errors";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import {
  parseRequiredLeadPriority,
  parseRequiredLeadStatus,
} from "~/server/workflow/domain/lead-schema-parser";
import {
  isAbonoBank,
  type ModalidadCobro,
  type ProductScope,
} from "~/contracts/workflow";

export async function requestLeadCreation(input: {
  ruc: string;
  executiveId?: number;
}) {
  const normalizedRuc = input.ruc.trim();

  if (!normalizedRuc) {
    throw validationError("ruc is required");
  }

  return runAction({
    actionName: "workflow.register_lead",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.registerLead({
        actor: workflowActorFrom(ctx),
        ruc: normalizedRuc,
        executiveId: input.executiveId ?? ctx.actor.userId,
      }),
  });
}

export async function requestLeadReview(input: {
  leadId: string;
  status: string;
  prioridad: string;
  reason: string;
}) {
  if (!input.reason?.trim()) {
    throw validationError("reason is required");
  }

  const reviewedStatus = parseRequiredLeadStatus(input.status);
  if (!reviewedStatus.ok) {
    throw validationError("invalid status");
  }
  const reviewedPrioridad = parseRequiredLeadPriority(input.prioridad);
  if (!reviewedPrioridad.ok) {
    throw validationError("invalid prioridad");
  }

  return runAction({
    actionName: "workflow.review_lead",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.commands.reviewLead({
        actor: workflowActorFrom(ctx),
        leadId: input.leadId,
        status: reviewedStatus.value,
        prioridad: reviewedPrioridad.value,
        reason: input.reason,
      }),
  });
}

export async function requestSaveCommercialScope(input: {
  leadId: string;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  giroNegocio: string;
  abonoBank: string;
  posTotal: number;
  linkScope: ProductScope;
  linkUrl: string | null;
  onlineScope: ProductScope;
  onlineUrl: string | null;
  onlineModalidad: ModalidadCobro | null;
}) {
  if (!input.proveedorActual?.trim()) {
    throw validationError("proveedorActual is required");
  }
  if (!input.giroNegocio?.trim()) {
    throw validationError("giroNegocio is required");
  }
  if (!isAbonoBank(input.abonoBank)) {
    throw validationError("abonoBank is invalid");
  }

  const abonoBank = input.abonoBank;

  return runAction({
    actionName: "workflow.save_commercial_scope",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.commands.saveCommercialScope({
        actor: workflowActorFrom(ctx),
        leadId: input.leadId,
        proveedorActual: input.proveedorActual,
        tasaActual: input.tasaActual,
        gpv: input.gpv,
        ticket: input.ticket,
        giroNegocio: input.giroNegocio,
        abonoBank,
        posTotal: input.posTotal,
        linkScope: input.linkScope,
        linkUrl: input.linkUrl,
        onlineScope: input.onlineScope,
        onlineUrl: input.onlineUrl,
        onlineModalidad: input.onlineModalidad,
      }),
  });
}

export async function requestQuotation(input: { leadId: string }) {
  return runAction({
    actionName: "workflow.request_quotation",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.requestQuotation({
        actor: workflowActorFrom(ctx),
        leadId: input.leadId,
      }),
  });
}

export async function requestRecordRepLegal(input: {
  leadId: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  dni: string;
  telefono: string;
  email: string;
}) {
  if (!input.nombres?.trim()) {
    throw validationError("nombres is required");
  }
  if (!input.dni?.trim()) {
    throw validationError("dni is required");
  }

  return runAction({
    actionName: "workflow.record_rep_legal",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.commands.recordRepLegal({
        actor: workflowActorFrom(ctx),
        ...input,
      }),
  });
}

export async function requestLeadReassignment(input: {
  leadId: string;
  newExecutiveId: number;
}) {
  return runAction({
    actionName: "workflow.reassign_lead",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.reassignLead({
        actor: workflowActorFrom(ctx),
        leadId: input.leadId,
        toExecutiveId: input.newExecutiveId,
      }),
  });
}

export async function requestAddLeadToFavorites(input: { leadId: string }) {
  return runAction({
    actionName: "workflow.add_lead_to_favorites",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.addToFavorites({
        actor: workflowActorFrom(ctx),
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
    execute: (ctx) =>
      getServerRuntime().workflow.commands.removeFromFavorites({
        actor: workflowActorFrom(ctx),
        leadId: input.leadId,
      }),
  });
}

export async function requestLeadSunatRefresh(input: { leadId: string }) {
  return runAction({
    actionName: "workflow.request_sunat_refresh",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.requestSunatRefresh({
        actor: workflowActorFrom(ctx),
        leadId: input.leadId,
      }),
  });
}
