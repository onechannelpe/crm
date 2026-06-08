"use server";

import type {
  CreateLeadInput,
  ReassignLeadInput,
  RecordRepLegalInput,
  ReviewLeadInput,
  SaveCommercialScopeInput,
  SaveDigitalPolicyInput,
} from "~/contracts/workflow/inputs";
import {
  ABONO_BANKS,
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  MODALIDAD_COBRO_KINDS,
  PRODUCT_SCOPES,
} from "~/contracts/workflow/vocabulary";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import type { Result } from "~/server/shared/result";

import { workflowActor } from "./actor";

type LeadRef = { leadId: string };

function parseLeadRef(input: unknown): Result<LeadRef, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
  }));
}

function parseCreateLead(input: unknown): Result<CreateLeadInput, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    ruc: r.str("ruc"),
    executiveId: r.optNum("executiveId") ?? undefined,
  }));
}

function parseReassignLead(
  input: unknown,
): Result<ReassignLeadInput, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
    newExecutiveId: r.num("newExecutiveId"),
  }));
}

function parseReviewLead(input: unknown): Result<ReviewLeadInput, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
    status: r.enum("status", LEAD_STATUSES),
    prioridad: r.enum("prioridad", LEAD_PRIORITIES),
    reason: r.str("reason"),
  }));
}

function parseCommercialScope(
  input: unknown,
): Result<SaveCommercialScopeInput, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
    proveedorActual: r.str("proveedorActual"),
    tasaActual: r.num("tasaActual"),
    gpv: r.num("gpv"),
    ticket: r.num("ticket"),
    giroNegocio: r.str("giroNegocio"),
    abonoBank: r.enum("abonoBank", ABONO_BANKS),
    posTotal: r.num("posTotal"),
  }));
}

function parseSaveDigitalPolicy(
  input: unknown,
): Result<SaveDigitalPolicyInput, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
    linkScope: r.enum("linkScope", PRODUCT_SCOPES),
    linkUrl: r.optStr("linkUrl"),
    onlineScope: r.enum("onlineScope", PRODUCT_SCOPES),
    onlineUrl: r.optStr("onlineUrl"),
    onlineModalidad:
      r.optEnum("onlineModalidad", MODALIDAD_COBRO_KINDS) ?? null,
  }));
}

function parseRecordRepLegal(
  input: unknown,
): Result<RecordRepLegalInput, DomainError> {
  return parseObject(input, validationFail, (r) => ({
    leadId: r.str("leadId"),
    nombres: r.str("nombres"),
    apellidoPaterno: r.str("apellidoPaterno"),
    apellidoMaterno: r.str("apellidoMaterno"),
    dni: r.str("dni"),
    telefono: r.str("telefono"),
    email: r.str("email"),
  }));
}

export async function requestLeadCreation(input: unknown) {
  return runAction({
    actionName: "workflow.register_lead",
    access: { kind: "auth" },
    parse: () => parseCreateLead(input),
    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.registerLead({
        actor: workflowActor(actor),
        ruc: payload.ruc,
        executiveId: payload.executiveId ?? actor.userId,
      }),
  });
}

export async function requestLeadReview(input: unknown) {
  return runAction({
    actionName: "workflow.review_lead",
    access: { kind: "auth" },
    parse: () => parseReviewLead(input),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.reviewLead({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestSaveCommercialScope(input: unknown) {
  return runAction({
    actionName: "workflow.save_commercial_scope",
    access: { kind: "auth" },
    parse: () => parseCommercialScope(input),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.saveCommercialScope({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestQuotation(input: unknown) {
  return runAction({
    actionName: "workflow.request_quotation",
    access: { kind: "auth" },
    parse: () => parseCommercialScope(input),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.requestQuotation({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestSaveDigitalPolicy(input: unknown) {
  return runAction({
    actionName: "workflow.save_digital_policy",
    access: { kind: "auth" },
    parse: () => parseSaveDigitalPolicy(input),
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
    actionName: "workflow.record_rep_legal",
    access: { kind: "auth" },
    parse: () => parseRecordRepLegal(input),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, payload) =>
      getServerRuntime().workflow.commands.recordRepLegal({
        actor: workflowActor(actor),
        ...payload,
      }),
  });
}

export async function requestStartSetupExecution(input: unknown) {
  return runAction({
    actionName: "workflow.start_setup_execution",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, { leadId }) =>
      getServerRuntime().workflow.commands.startSetupExecution({
        actor: workflowActor(actor),
        leadId,
      }),
  });
}

export async function requestLeadReassignment(input: unknown) {
  return runAction({
    actionName: "workflow.reassign_lead",
    access: { kind: "auth" },
    parse: () => parseReassignLead(input),
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
    actionName: "workflow.add_lead_to_favorites",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, { leadId }) =>
      getServerRuntime().workflow.commands.addToFavorites({
        actor: workflowActor(actor),
        leadId,
      }),
  });
}

export async function requestRemoveLeadFromFavorites(input: unknown) {
  return runAction({
    actionName: "workflow.remove_lead_from_favorites",
    access: { kind: "auth" },
    parse: () => parseLeadRef(input),
    audit: ({ leadId }) => ({ leadId }),
    execute: ({ actor }, { leadId }) =>
      getServerRuntime().workflow.commands.removeFromFavorites({
        actor: workflowActor(actor),
        leadId,
      }),
  });
}

export async function requestLeadSunatRefresh(input: unknown) {
  return runAction({
    actionName: "workflow.request_sunat_refresh",
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
