"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { requestContactAssignmentRefill } from "~/server/contact-assignments/application/request-refill";
import { repos, runInRepositoryTransaction } from "~/server/shared/context";
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

  const result = await requestContactAssignmentRefill(cmdResult.value, {
    repos,
    runInTransaction: runInRepositoryTransaction,
  });
  if (isErr(result)) mapContactAssignmentError(result.error);

  return result.value;
}
