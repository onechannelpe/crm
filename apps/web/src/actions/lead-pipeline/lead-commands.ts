"use server";

import { validationError } from "~/lib/app-errors";
import { LEAD_STATUS_VALUES, PRIORIDAD_VALUES } from "~/lib/db/types";
import {
  completeExecutiveInput,
  createLead,
  reassignLead,
  reviewLead,
} from "~/server/lead-pipeline/application/lead-commands";
import { runAction } from "~/server/shared/action-runtime";

export async function requestLeadCreation(input: {
  ruc: string;
  executiveId?: number;
}) {
  if (!input.ruc?.trim()) {
    throw validationError("ruc is required");
  }

  return runAction({
    actionName: "lead_pipeline.create_lead",
    permission: "lead:pipeline",
    input,
    execute: (ctx) =>
      createLead({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        executiveId: input.executiveId ?? ctx.actor.userId,
        ruc: input.ruc,
      }),
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
    actionName: "lead_pipeline.review_lead",
    permission: "lead:review",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      reviewLead({
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

export async function requestExecutiveInputCompletion(input: {
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
    actionName: "lead_pipeline.complete_executive_input",
    permission: "lead:register",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      completeExecutiveInput({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        branchId: ctx.actor.branchId,
        ...input,
      }),
  });
}

export async function requestLeadReassignment(input: {
  leadId: number;
  newExecutiveId: number;
}) {
  return runAction({
    actionName: "lead_pipeline.reassign_lead",
    permission: "lead:reassign",
    input,
    execute: (ctx) =>
      reassignLead({
        actorUserId: ctx.actor.userId,
        actorRole: ctx.actor.role,
        ...input,
      }),
  });
}
