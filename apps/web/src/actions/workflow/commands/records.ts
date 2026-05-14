"use server";

import {
  toLeadIdActorInput,
  toReassignLeadInput,
  toRecordRepLegalInput,
  toRegisterLeadInput,
  toReviewLeadInput,
  toSaveCommercialScopeInput,
  toSaveDigitalPolicyInput,
} from "~/actions/workflow/mappers";
import {
  type CreateLeadInput,
  type LeadIdInput,
  type ReassignLeadInput,
  type RecordRepLegalInput,
  type RequestQuotationInput,
  type ReviewLeadInput,
  type SaveCommercialScopeInput,
  type SaveDigitalPolicyInput,
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
      getServerRuntime().workflow.commands.registerLead(
        toRegisterLeadInput(ctx, input),
      ),
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
      getServerRuntime().workflow.commands.reviewLead(
        toReviewLeadInput(ctx, input),
      ),
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
      getServerRuntime().workflow.commands.saveCommercialScope(
        toSaveCommercialScopeInput(ctx, input),
      ),
  });
}

export async function requestQuotation(input: RequestQuotationInput) {
  if (!input.proveedorActual?.trim()) {
    throw validationError("proveedorActual is required");
  }
  if (!input.giroNegocio?.trim()) {
    throw validationError("giroNegocio is required");
  }

  return runAction({
    actionName: "workflow.request_quotation",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.commands.requestQuotation(
        toSaveCommercialScopeInput(ctx, input),
      ),
  });
}

export async function requestSaveDigitalPolicy(input: SaveDigitalPolicyInput) {
  return runAction({
    actionName: "workflow.save_digital_policy",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      getServerRuntime().workflow.commands.saveDigitalPolicy(
        toSaveDigitalPolicyInput(ctx, input),
      ),
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
      getServerRuntime().workflow.commands.recordRepLegal(
        toRecordRepLegalInput(ctx, input),
      ),
  });
}

export async function requestLeadReassignment(input: ReassignLeadInput) {
  return runAction({
    actionName: "workflow.reassign_lead",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.reassignLead(
        toReassignLeadInput(ctx, input),
      ),
  });
}

export async function requestAddLeadToFavorites(input: LeadIdInput) {
  return runAction({
    actionName: "workflow.add_lead_to_favorites",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.addToFavorites(
        toLeadIdActorInput(ctx, input),
      ),
  });
}

export async function requestRemoveLeadFromFavorites(input: LeadIdInput) {
  return runAction({
    actionName: "workflow.remove_lead_from_favorites",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.removeFromFavorites(
        toLeadIdActorInput(ctx, input),
      ),
  });
}

export async function requestLeadSunatRefresh(input: LeadIdInput) {
  return runAction({
    actionName: "workflow.request_sunat_refresh",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      getServerRuntime().workflow.commands.requestSunatRefresh(
        toLeadIdActorInput(ctx, input),
      ),
  });
}
