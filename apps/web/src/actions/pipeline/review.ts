"use server";

import { validationError } from "~/lib/app-errors";
import { listReviewQueueQuery } from "~/server/leads/application/list-review-queue";
import { reviewLeadPrioridadUseCase } from "~/server/leads/application/review-lead-prioridad";
import { reviewLeadStatusUseCase } from "~/server/leads/application/review-lead-status";
import { runAction } from "~/server/shared/action-runtime";
import { Ok } from "~/server/shared/result";

export async function updateLeadStatus(
  input: Omit<
    Parameters<typeof reviewLeadStatusUseCase>[0],
    "actorId" | "branchId"
  >,
): Promise<void> {
  if (!input.reason?.trim()) throw validationError("reason is required");

  return runAction({
    actionName: "lead.update_status",
    permission: "lead:review",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      reviewLeadStatusUseCase({
        leadId: input.leadId,
        status: input.status,
        reason: input.reason,
        actorId: ctx.actor.userId,
        branchId: ctx.actor.branchId,
      }),
  });
}

export async function updateLeadPrioridad(
  input: Omit<
    Parameters<typeof reviewLeadPrioridadUseCase>[0],
    "actorId" | "branchId"
  >,
): Promise<void> {
  if (!input.reason?.trim()) throw validationError("reason is required");

  return runAction({
    actionName: "lead.update_prioridad",
    permission: "lead:review",
    input: { leadId: input.leadId },
    execute: (ctx) =>
      reviewLeadPrioridadUseCase({
        leadId: input.leadId,
        prioridad: input.prioridad,
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
