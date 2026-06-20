import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import type { AppContext } from "~/server/platform/action/context";
import {
  fail,
  forbidden,
  type DomainError,
} from "~/server/shared/domain-error";
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
    return Err(fail("decision_note_required"));
  }

  return deps.uow.run(async (tx) => {
    const request = await tx.capacityRequests.findById(input.requestId);
    if (!request) {
      return Err(fail("request_not_found"));
    }
    if (request.status !== "pending") {
      return Err(fail("request_not_pending"));
    }

    const managed = await canManageExecutive(ctx.actor, request.user_id, tx);
    if (!managed.target) {
      return Err(fail("request_target_not_found"));
    }
    if (!managed.ok) {
      return Err(forbidden());
    }

    const rejectedResult = await tx.capacityRequests.markRejected(
      request.id,
      ctx.actor.userId,
      note,
    );
    if (!rejectedResult?.numUpdatedRows) {
      return Err(fail("request_not_pending"));
    }

    return Ok({ success: true as const });
  });
}
