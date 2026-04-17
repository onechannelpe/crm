import type { AssignContactsCommand } from "~/actions/contact-assignments/contracts";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { isBranchId, type UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

export function parseAssignContactsCommand(
  actorUserId: UserId,
  branchId: unknown,
): Result<AssignContactsCommand, DomainError> {
  if (typeof branchId !== "string" || !isBranchId(branchId)) {
    return Err(
      domainError(
        "validation",
        "lead.branch_id.invalid",
        "branchId must be a UUID",
      ),
    );
  }
  return Ok({ actorUserId, branchId });
}
