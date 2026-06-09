import { checkActionRateLimit } from "~/lib/security/action-rate-limit";
import { grantLeadCapacity } from "~/server/capacity-usage/lead-usage";
import { grantSearchCapacity } from "~/server/capacity-usage/search-usage";
import type { AppContext } from "~/server/shared/action-runtime/context";
import {
  fail,
  forbidden,
  type DomainError,
} from "~/server/shared/domain-error";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";

import { canManageExecutive } from "../../domain/access-policy";
import { normalizeDecisionNote } from "../../domain/request-policy";
import type { CapacityApprovalDeps } from "./shared";

export async function approveCapacityRequest(
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

    const note = normalizeDecisionNote(input.note);
    const approvedResult = await tx.capacityRequests.markApproved(
      request.id,
      ctx.actor.userId,
      note,
    );
    if (!approvedResult?.numUpdatedRows) {
      return Err(fail("request_not_pending"));
    }

    if (request.kind === "search_extra") {
      const granted = await grantSearchCapacity(
        {
          actorUserId: ctx.actor.userId,
          targetUserId: request.user_id,
          amount: request.requested_amount,
          reason: note ?? request.reason,
        },
        tx,
      );
      if (isErr(granted)) return granted;
    } else {
      const granted = await grantLeadCapacity(
        {
          actorUserId: ctx.actor.userId,
          targetUserId: request.user_id,
          amount: request.requested_amount,
          reason: note ?? request.reason,
        },
        tx,
      );
      if (isErr(granted)) return granted;
    }

    return Ok({ success: true as const });
  });
}
