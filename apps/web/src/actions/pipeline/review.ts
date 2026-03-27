"use server";

import { validationError } from "~/lib/app-errors";
import { LEAD_STATUS_VALUES, PRIORIDAD_VALUES } from "~/lib/db/types";
import type { LeadStatus, Prioridad } from "~/lib/db/types";
import { listReviewQueueQuery } from "~/server/leads/application/list-review-queue";
import { reviewLeadPrioridadUseCase } from "~/server/leads/application/review-lead-prioridad";
import { reviewLeadStatusUseCase } from "~/server/leads/application/review-lead-status";
import { runAction } from "~/server/shared/action-runtime";
import { Ok } from "~/server/shared/result";

function isLeadStatus(v: string): v is LeadStatus {
  return (LEAD_STATUS_VALUES as readonly string[]).includes(v);
}

function isPrioridad(v: string): v is Prioridad {
  return (PRIORIDAD_VALUES as readonly string[]).includes(v);
}

export async function updateLeadStatus(input: {
  leadId: number;
  status: string;
  reason: string;
}): Promise<void> {
  if (!isLeadStatus(input.status))
    throw validationError("Invalid status value");
  if (!input.reason?.trim()) throw validationError("reason is required");

  return runAction({
    actionName: "lead.update_status",
    permission: "lead:review",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      reviewLeadStatusUseCase({
        leadId: input.leadId,
        status: input.status as LeadStatus,
        reason: input.reason,
        actorId: ctx.actor.userId,
        branchId: ctx.actor.branchId,
      }),
  });
}

export async function updateLeadPrioridad(input: {
  leadId: number;
  prioridad: string;
  reason: string;
}): Promise<void> {
  if (!isPrioridad(input.prioridad))
    throw validationError("Invalid prioridad value");
  if (!input.reason?.trim()) throw validationError("reason is required");

  return runAction({
    actionName: "lead.update_prioridad",
    permission: "lead:review",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      reviewLeadPrioridadUseCase({
        leadId: input.leadId,
        prioridad: input.prioridad as Prioridad,
        reason: input.reason,
        actorId: ctx.actor.userId,
        branchId: ctx.actor.branchId,
      }),
  });
}

export async function listLeadsForReview(filters: {
  stage?: string;
  limit?: number;
  offset?: number;
}) {
  return runAction({
    actionName: "lead.list_review",
    permission: "lead:review",
    input: {},
    execute: async () => Ok(await listReviewQueueQuery(filters)),
  });
}
