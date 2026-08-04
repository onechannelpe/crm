import { fail, forbidden, type DomainError } from "~/domain/errors";
import type { CapacityRequestId } from "~/domain/ids";
import type { AppContext } from "~/server/platform/action/context";
import { Err, Ok, type Result } from "~/shared/result";

import { normalizeDecisionNote } from "../../domain/request-policy";
import { canManageExecutive } from "../authorize-capacity-actor";
import type { CapacityApprovalDeps } from "./shared";

export async function rejectCapacityRequest(
  ctx: AppContext,
  deps: CapacityApprovalDeps,
  input: { requestId: CapacityRequestId; note: string | null },
): Promise<Result<{ success: true }, DomainError>> {
  await deps.rateLimiter.enforce(
    "capacity.approve",
    ctx.actor.userId,
    ctx,
    ctx.ipAddress,
  );

  return deps.uow.run(async (tx) => {
    const note = normalizeDecisionNote(input.note);
    if (!note) {
      return Err(fail("decision_note_required"));
    }

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
      ctx.operationAt,
    );
    if (!rejectedResult?.numUpdatedRows) {
      return Err(fail("request_not_pending"));
    }

    return Ok({ success: true as const });
  });
}
