"use server";

import { validationError } from "~/lib/app-errors";
import { LEAD_STATUS_VALUES, PRIORIDAD_VALUES } from "~/lib/db/types";
import { completeCommercialInput } from "~/server/pipeline/application/commands/complete-commercial-input";
import { reassignLead } from "~/server/pipeline/application/commands/reassign-lead";
import { registerLead } from "~/server/pipeline/application/commands/register-lead";
import { reviewLead } from "~/server/pipeline/application/commands/review-lead";
import {
  createCompleteCommercialInputDeps,
  createRegisterLeadDeps,
  createReassignLeadDeps,
  createReviewLeadDeps,
} from "~/server/pipeline/infrastructure/deps";
import { runAction } from "~/server/shared/action-runtime";

import {
  runPipelineCommand,
  runPipelineNotificationCommand,
  runPipelineRegistrationCommand,
} from "../runtime/commands";

export async function requestLeadCreation(input: {
  ruc: string;
  executiveId?: number;
}) {
  if (!input.ruc?.trim()) {
    throw validationError("ruc is required");
  }

  return runAction({
    actionName: "pipeline.register_lead",
    permission: "lead:register",
    input,
    execute: (ctx) =>
      runPipelineRegistrationCommand(
        createRegisterLeadDeps,
        ({ deps, auditService, engineGateway }) =>
          registerLead({
            actorUserId: ctx.actor.userId,
            actorRole: ctx.actor.role,
            executiveId: input.executiveId ?? ctx.actor.userId,
            ruc: input.ruc,
            deps,
            auditService,
            engineGateway,
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

  const status = LEAD_STATUS_VALUES.find((value) => value === input.status);
  if (!status) {
    throw validationError("invalid status");
  }

  const prioridad = PRIORIDAD_VALUES.find((value) => value === input.prioridad);
  if (!prioridad) {
    throw validationError("invalid prioridad");
  }

  return runAction({
    actionName: "pipeline.review_lead",
    permission: "lead:review",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      runPipelineNotificationCommand(
        createReviewLeadDeps,
        ({ deps, auditService, notificationCenter }) =>
          reviewLead(deps, auditService, notificationCenter, {
            actorUserId: ctx.actor.userId,
            actorRole: ctx.actor.role,
            branchId: ctx.actor.branchId,
            leadId: input.leadId,
            status,
            prioridad,
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
    permission: "lead:register",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      runPipelineNotificationCommand(
        createCompleteCommercialInputDeps,
        ({ deps, auditService, notificationCenter }) =>
          completeCommercialInput(deps, auditService, notificationCenter, {
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
    permission: "lead:reassign",
    input,
    execute: (ctx) =>
      runPipelineCommand(createReassignLeadDeps, ({ deps, auditService }) =>
        reassignLead(deps, auditService, {
          actorUserId: ctx.actor.userId,
          actorRole: ctx.actor.role,
          ...input,
        }),
      ),
  });
}
