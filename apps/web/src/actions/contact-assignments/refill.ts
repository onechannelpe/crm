"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { assignContacts } from "~/server/contact-assignments/application/assign-contacts";
import { createContactAssignmentRefillContext } from "~/server/contact-assignments/infrastructure/refill-context";
import { isErr } from "~/server/shared/result";

import { mapContactAssignmentError } from "./errors";
import { parseContactAssignmentRefillCommand } from "./input";

export async function refillContactAssignments() {
  const session = await requirePermission("lead:work");

  const cmdResult = parseContactAssignmentRefillCommand(
    session.userId,
    session.branchId,
  );
  if (isErr(cmdResult)) mapContactAssignmentError(cmdResult.error);

  const result = await assignContacts(cmdResult.value, {
    ...createContactAssignmentRefillContext(),
  });
  if (isErr(result)) mapContactAssignmentError(result.error);

  return result.value;
}
