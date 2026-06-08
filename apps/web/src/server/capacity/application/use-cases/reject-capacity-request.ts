import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../../domain/access-policy";
import { normalizeDecisionNote } from "../../domain/request-policy";
import type { CapacityApprovalDeps } from "./shared";

export async function rejectCapacityRequest(
  ctx: AppContext,
  deps: CapacityApprovalDeps,
  input: { requestId: number; note: string | null },
): Promise<Result<{ success: true }, DomainError>> {
  await checkActionRateLimit(
    "capacity.approve",
    ctx.actor.userId,
    deps.rateLimitDeps,
    ctx.ipAddress,
  );
  const note = normalizeDecisionNote(input.note);
  if (!note) {
    return Err(
      domainError(
        "validation",
        "decision_note_required",
        "Decision note is required for rejection",
      ),
    );
  }

  return deps.uow.run(async (tx) => {
    const request = await tx.capacityRequests.findById(input.requestId);
    if (!request) {
      return Err(
        domainError("not_found", "request_not_found", "Request not found"),
      );
    }
    if (request.status !== "pending") {
      return Err(
        domainError(
          "conflict",
          "request_not_pending",
          "Request is no longer pending",
        ),
      );
    }

    const managed = await canManageExecutive(ctx.actor, request.user_id, tx);
    if (!managed.target) {
      return Err(
        domainError(
          "not_found",
          "request_target_not_found",
          "Request target not found",
        ),
      );
    }
    if (!managed.ok) {
      return Err(
        domainError("forbidden", "forbidden", "Cannot reject this request"),
      );
    }

    const rejectedResult = await tx.capacityRequests.markRejected(
      request.id,
      ctx.actor.userId,
      note,
    );
    if (!rejectedResult?.numUpdatedRows) {
      return Err(
        domainError(
          "conflict",
          "request_not_pending",
          "Request is no longer pending",
        ),
      );
    }

    return Ok({ success: true as const });
  });
}
