"use server";

import { throwDomainError } from "~/actions/throw-domain-error";
import { validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import { requirePermission } from "~/lib/auth/access/session";
import { LEAD_STATUS_VALUES, PRIORIDAD_VALUES } from "~/lib/db/types";
import type { LeadStatus, Prioridad } from "~/lib/db/types";
import { runObservedAction } from "~/lib/observability/run-observed-action";
import { listReviewQueueQuery } from "~/server/leads/application/list-review-queue";
import { reviewLeadPrioridadUseCase } from "~/server/leads/application/review-lead-prioridad";
import { reviewLeadStatusUseCase } from "~/server/leads/application/review-lead-status";
import { isErr } from "~/server/shared/result";

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
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "lead.update_status",
    actor,
    input: { leadId: input.leadId },
    run: async () => {
      const session = await requirePermission("lead:review");
      actor.userId = session.userId;
      actor.role = session.role;

      if (!isLeadStatus(input.status))
        throw validationError("Invalid status value");
      if (!input.reason?.trim()) throw validationError("reason is required");

      const result = await reviewLeadStatusUseCase({
        leadId: input.leadId,
        status: input.status,
        reason: input.reason,
        actorId: session.userId,
        branchId: session.branchId,
      });

      if (isErr(result)) throwDomainError(result.error);
    },
  });
}

export async function updateLeadPrioridad(input: {
  leadId: number;
  prioridad: string;
  reason: string;
}): Promise<void> {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "lead.update_prioridad",
    actor,
    input: { leadId: input.leadId },
    run: async () => {
      const session = await requirePermission("lead:review");
      actor.userId = session.userId;
      actor.role = session.role;

      if (!isPrioridad(input.prioridad))
        throw validationError("Invalid prioridad value");
      if (!input.reason?.trim()) throw validationError("reason is required");

      const result = await reviewLeadPrioridadUseCase({
        leadId: input.leadId,
        prioridad: input.prioridad,
        reason: input.reason,
        actorId: session.userId,
        branchId: session.branchId,
      });

      if (isErr(result)) throwDomainError(result.error);
    },
  });
}

export async function listLeadsForReview(filters: {
  stage?: string;
  limit?: number;
  offset?: number;
}) {
  const actor = { userId: null as number | null, role: null as Role | null };
  return runObservedAction({
    actionName: "lead.list_review",
    actor,
    input: {},
    run: async () => {
      const session = await requirePermission("lead:review");
      actor.userId = session.userId;
      actor.role = session.role;

      return listReviewQueueQuery(filters);
    },
  });
}
