import type { AssignContactsCommand } from "~/server/contact-assignments/application/contracts";
import { invalid, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

export function parseAssignContactsCommand(
  actorUserId: number,
  branchId: unknown,
): Result<AssignContactsCommand, DomainError> {
  if (
    typeof branchId !== "number" ||
    !Number.isInteger(branchId) ||
    branchId <= 0
  ) {
    return Err(invalid({ code: "lead.branch_id.invalid" }));
  }
  return Ok({ actorUserId, branchId });
}
