"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { assignContacts } from "~/server/contact-assignments/application/assign-contacts";
import { createContactAssignmentContext } from "~/server/contact-assignments/infrastructure/assignment-context";
import { isErr } from "~/server/shared/result";

import { mapContactAssignmentError } from "./errors";
import { parseAssignContactsCommand } from "./input";

export async function assignCurrentUserContacts() {
  const session = await requirePermission("lead:work");

  const cmdResult = parseAssignContactsCommand(
    session.userId,
    session.branchId,
  );
  if (isErr(cmdResult)) mapContactAssignmentError(cmdResult.error);

  const result = await assignContacts(cmdResult.value, {
    ...createContactAssignmentContext(),
  });
  if (isErr(result)) mapContactAssignmentError(result.error);

  return result.value;
}
