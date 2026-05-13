"use server";

import { workflowActorFrom } from "~/actions/workflow/shared";
import {
  type CreateLeadInput,
  type LeadIdInput,
  type ReassignLeadInput,
  type RecordRepLegalInput,
  type ReviewLeadInput,
  type SaveCommercialScopeInput,
} from "~/contracts/workflow";
import { validationError } from "~/lib/app-errors";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function requestLeadCreation(input: CreateLeadInput) {
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

export async function requestLeadReview(input: ReviewLeadInput) {
  if (!input.reason?.trim()) {
    throw validationError("reason is required");
  }

  return runAction({
    actionName: "workflow.review_lead",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.commands.reviewLead({
        actor: workflowActorFrom(ctx),
        leadId: input.leadId,
        status: input.status,
        prioridad: input.prioridad,
        reason: input.reason,
      }),
  });
}

export async function requestSaveCommercialScope(
  input: SaveCommercialScopeInput,
) {
  if (!input.proveedorActual?.trim()) {
    throw validationError("proveedorActual is required");
  }
  if (!input.giroNegocio?.trim()) {
    throw validationError("giroNegocio is required");
  }

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
        abonoBank: input.abonoBank,
        posTotal: input.posTotal,
        linkScope: input.linkScope,
        linkUrl: input.linkUrl,
        onlineScope: input.onlineScope,
        onlineUrl: input.onlineUrl,
        onlineModalidad: input.onlineModalidad,
      }),
  });
}

export async function requestQuotation(input: LeadIdInput) {
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

export async function requestRecordRepLegal(input: RecordRepLegalInput) {
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

export async function requestLeadReassignment(input: ReassignLeadInput) {
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

export async function requestAddLeadToFavorites(input: LeadIdInput) {
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

export async function requestRemoveLeadFromFavorites(input: LeadIdInput) {
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

export async function requestLeadSunatRefresh(input: LeadIdInput) {
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
