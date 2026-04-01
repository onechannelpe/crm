"use server";

import { validationError } from "~/lib/app-errors";
import { LEAD_STATUS_VALUES, PRIORIDAD_VALUES } from "~/lib/db/types";
import { completeCommercialInput } from "~/server/pipeline/application/commands/complete-commercial-input";
import { reassignRecord } from "~/server/pipeline/application/commands/reassign-record";
import { registerRecord } from "~/server/pipeline/application/commands/register-record";
import { reviewRecord } from "~/server/pipeline/application/commands/review-record";
import { runAction } from "~/server/shared/action-runtime";

export async function requestRecordCreation(input: {
  ruc: string;
  executiveId?: number;
}) {
  if (!input.ruc?.trim()) {
    throw validationError("ruc is required");
  }

  return runAction({
    actionName: "pipeline.register_record",
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      registerRecord({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        executiveId: input.executiveId ?? ctx.actor.userId,
        ruc: input.ruc,
      }),
  });
}

export async function requestRecordReview(input: {
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
    actionName: "pipeline.review_record",
    permission: "lead:review",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      reviewRecord({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        branchId: ctx.actor.branchId,
        leadId: input.leadId,
        status,
        prioridad,
        reason: input.reason,
      }),
  });
}

export async function requestCommercialInputCompletion(input: {
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
      completeCommercialInput({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        branchId: ctx.actor.branchId,
        ...input,
      }),
  });
}

export async function requestRecordReassignment(input: {
  leadId: number;
  newExecutiveId: number;
}) {
  return runAction({
    actionName: "pipeline.reassign_record",
    permission: "lead:reassign",
    input,
    execute: (ctx) =>
      reassignRecord({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        ...input,
      }),
  });
}
