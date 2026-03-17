import { domainError } from "~/server/shared/domain-error";
import { asBranchId, type UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { RequestLeadRefillCommand } from "~/server/lead-workflow/request-refill";

export function parseLeadRefillCommand(
  actorUserId: UserId,
  branchId: unknown,
): Result<RequestLeadRefillCommand, ReturnType<typeof domainError>> {
  if (typeof branchId !== "number" || !Number.isInteger(branchId) || branchId <= 0) {
    return Err(domainError("validation", "lead.branch_id.invalid", "branchId must be a positive integer"));
  }
  return Ok({ actorUserId, branchId: asBranchId(branchId) });
}
