"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { repos, runInRepositoryTransaction } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";
import { requestLeadRefill } from "~/server/lead-workflow/request-refill";

import { mapLeadError } from "./errors";
import { parseLeadRefillCommand } from "./input";

export async function refillLeads() {
  const session = await requirePermission("lead:work");

  const cmdResult = parseLeadRefillCommand(session.userId, session.branchId);
  if (isErr(cmdResult)) mapLeadError(cmdResult.error);

  const result = await requestLeadRefill(cmdResult.value, {
    repos,
    runInTransaction: runInRepositoryTransaction,
  });
  if (isErr(result)) mapLeadError(result.error);

  return result.value;
}
