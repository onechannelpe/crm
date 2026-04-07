"use server";

import {
  LEAD_PRIORITIES,
  LEAD_STATUSES,
  type LeadPriority,
  type LeadStatus,
} from "~/actions/pipeline/contracts";
import { validationError } from "~/lib/app-errors";
import {
  isValidLeadRucInput,
  normalizeLeadRucInput,
} from "~/lib/validation/lead";
import { completeCommercialInput } from "~/server/pipeline/application/commands/complete-commercial-input";
import { reassignLead } from "~/server/pipeline/application/commands/reassign-lead";
import { registerLead } from "~/server/pipeline/application/commands/register-lead";
import { reviewLead } from "~/server/pipeline/application/commands/review-lead";
import { runPipelineCommand } from "~/server/pipeline/infrastructure/command-runtime";
import { runAction } from "~/server/shared/action-runtime";

function parseRequiredLeadStatus(value: string): LeadStatus {
  const parsed = LEAD_STATUSES.find((status) => status === value);
  if (!parsed) {
    throw validationError("invalid status");
  }
  return parsed;
}

function parseRequiredLeadPriority(value: string): LeadPriority {
  const parsed = LEAD_PRIORITIES.find((priority) => priority === value);
  if (!parsed) {
    throw validationError("invalid prioridad");
  }
  return parsed;
}

export async function requestLeadCreation(input: {
  ruc: string;
  executiveId?: number;
}) {
  const normalizedRuc = normalizeLeadRucInput(input.ruc);

  if (!isValidLeadRucInput(normalizedRuc)) {
    throw validationError("ruc is required");
  }

  return runAction({
    actionName: "pipeline.register_lead",
    access: { kind: "auth" },
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
          ruc: normalizedRuc,
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

  const reviewedStatus = parseRequiredLeadStatus(input.status);
  const reviewedPrioridad = parseRequiredLeadPriority(input.prioridad);

  return runAction({
    actionName: "pipeline.review_lead",
    access: { kind: "auth" },
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
    access: { kind: "auth" },
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
    access: { kind: "auth" },
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
