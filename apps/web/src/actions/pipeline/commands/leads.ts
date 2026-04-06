"use server";

import { validationError } from "~/lib/app-errors";
import { completeCommercialInput } from "~/server/pipeline/application/commands/complete-commercial-input";
import { reassignLead } from "~/server/pipeline/application/commands/reassign-lead";
import { registerLead } from "~/server/pipeline/application/commands/register-lead";
import { reviewLead } from "~/server/pipeline/application/commands/review-lead";
import {
  parseRequiredLeadPriority,
  parseRequiredLeadStatus,
} from "~/server/pipeline/domain/lead";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/command-runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function requestLeadCreation(input: {
  ruc: string;
  executiveId?: number;
}) {
  if (!input.ruc?.trim()) {
    throw validationError("ruc is required");
  }

  return runAction({
    actionName: "pipeline.register_lead",
    requireAuth: true,
    input,
    execute: (ctx) =>
      runPipelineCommand(({ deps, auditService, engineGateway }) =>
        registerLead({
          deps: deps.registerLead,
          auditService,
          engineGateway,
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          executiveId: input.executiveId ?? ctx.actor.userId,
          ruc: input.ruc,
        }),
      ),
  });
}

export async function requestLeadReview(input: {
  leadId: number;
  status: string;
  prioridad: string;
  reason: string;
}) {
  if (!input.reason?.trim()) {
    throw validationError("reason is required");
  }

  const status = parseRequiredLeadStatus(input.status);
  if (!status.ok) {
    throw validationError("invalid status");
  }
  const reviewedStatus = status.value;

  const prioridad = parseRequiredLeadPriority(input.prioridad);
  if (!prioridad.ok) {
    throw validationError("invalid prioridad");
  }
  const reviewedPrioridad = prioridad.value;

  return runAction({
    actionName: "pipeline.review_lead",
    requireAuth: true,
    input: { leadId: input.leadId },
    execute: (ctx) =>
      runPipelineCommand(({ deps, auditService, notificationCenter }) =>
        reviewLead({
          deps: deps.reviewLead,
          auditService,
          notificationCenter,
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          branchId: ctx.actor.branchId,
          leadId: input.leadId,
          status: reviewedStatus,
          prioridad: reviewedPrioridad,
          reason: input.reason,
        }),
      ),
  });
}

export async function requestLeadCommercialInputCompletion(input: {
  leadId: number;
  proveedorActual: string;
  tasaActual: number;
  gpv: number;
  ticket: number;
  abono: number;
  cantidadPos: number;
}) {
  if (!input.proveedorActual?.trim()) {
    throw validationError("proveedorActual is required");
  }

  return runAction({
    actionName: "pipeline.complete_commercial_input",
    requireAuth: true,
    input: { leadId: input.leadId },
    execute: (ctx) =>
      runPipelineCommand(({ deps, auditService, notificationCenter }) =>
        completeCommercialInput({
          deps: deps.completeCommercialInput,
          auditService,
          notificationCenter,
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          branchId: ctx.actor.branchId,
          ...input,
        }),
      ),
  });
}

export async function requestLeadReassignment(input: {
  leadId: number;
  newExecutiveId: number;
}) {
  return runAction({
    actionName: "pipeline.reassign_lead",
    requireAuth: true,
    input,
    execute: (ctx) =>
      runPipelineCommand(({ deps, auditService }) =>
        reassignLead({
          deps: deps.reassignLead,
          auditService,
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          ...input,
        }),
      ),
  });
}
