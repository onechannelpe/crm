"use server";

import { validationError } from "~/lib/app-errors";
import { runAction } from "~/server/shared/action-runtime";
import { requestSunatRefresh } from "~/server/workflow/application/commands/request-sunat-refresh";
import {
  parseRequiredLeadPriority,
  parseRequiredLeadStatus,
} from "~/server/workflow/domain/lead-schema-parser";
import { runWorkflowCommand } from "~/server/workflow/infrastructure/command-runtime";
import type {
  CulqiProductKind,
  ModalidadCobro,
} from "~/workflow/contracts/lead-schema";

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
      runWorkflowCommand(({ commandApi }) =>
        commandApi.registerLead({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          ruc: normalizedRuc,
          executiveId: input.executiveId ?? ctx.actor.userId,
        }),
      ),
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
      runWorkflowCommand(({ commandApi }) =>
        commandApi.reviewLead({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          leadId: input.leadId,
          status: reviewedStatus.value,
          prioridad: reviewedPrioridad.value,
          reason: input.reason,
        }),
      ),
  });
}

export async function requestLeadCommercialInputCompletion(input: {
  leadId: string;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  giroNegocio: string;
  tipoProducto: CulqiProductKind;
  urlCliente: string | null;
  modalidadCobro: ModalidadCobro;
  repLegalNombres: string;
  repLegalApellidoPaterno: string;
  repLegalApellidoMaterno: string;
  repLegalDni: string;
  repLegalTelefono: string;
  repLegalEmail: string;
}) {
  if (!input.proveedorActual?.trim()) {
    throw validationError("proveedorActual is required");
  }
  if (!input.giroNegocio?.trim()) {
    throw validationError("giroNegocio is required");
  }

  return runAction({
    actionName: "workflow.complete_commercial_input",
    access: { kind: "auth" },
    input: { leadId: input.leadId },
    execute: (ctx) =>
      runWorkflowCommand(({ commandApi }) =>
        commandApi.completeCommercialInput({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          ...input,
        }),
      ),
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
      runWorkflowCommand(({ commandApi }) =>
        commandApi.reassignLead({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          leadId: input.leadId,
          toExecutiveId: input.newExecutiveId,
        }),
      ),
  });
}

export async function requestAddLeadToFavorites(input: { leadId: string }) {
  return runAction({
    actionName: "workflow.add_lead_to_favorites",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      runWorkflowCommand(({ commandApi }) =>
        commandApi.addToFavorites({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          leadId: input.leadId,
        }),
      ),
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
      runWorkflowCommand(({ commandApi }) =>
        commandApi.removeFromFavorites({
          actor: {
            userId: ctx.actor.userId,
            role: ctx.actor.role,
            branchId: ctx.actor.branchId,
          },
          leadId: input.leadId,
        }),
      ),
  });
}

export async function requestLeadSunatRefresh(input: { leadId: string }) {
  return runAction({
    actionName: "workflow.request_sunat_refresh",
    access: { kind: "auth" },
    input,
    execute: (ctx) =>
      runWorkflowCommand(({ repos, auditService, leadEnrichmentQueue }) =>
        requestSunatRefresh({
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          leadId: input.leadId,
          leadRepo: repos.leads,
          enrichmentQueue: leadEnrichmentQueue,
          auditService,
        }),
      ),
  });
}
