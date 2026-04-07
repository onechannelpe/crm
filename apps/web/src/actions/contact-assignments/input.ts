import type { AssignContactsCommand } from "~/server/contact-assignments/application/contracts";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

export function parseAssignContactsCommand(
  actorUserId: UserId,
  branchId: unknown,
): Result<AssignContactsCommand, DomainError> {
  if (
    typeof branchId !== "number" ||
    !Number.isInteger(branchId) ||
    branchId <= 0
  ) {
    return Err(
      domainError(
        "validation",
        "lead.branch_id.invalid",
        "branchId must be a positive integer",
      ),
    );
  }
  return Ok({ actorUserId, branchId });
}
