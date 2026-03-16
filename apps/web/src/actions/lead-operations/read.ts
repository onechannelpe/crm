"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { leadRefillService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { fromLeadCapacitySnapshotError, throwLeadActionError } from "./errors";

export async function getMyLeadCapacity() {
  const session = await requirePermission("capacity:read:self");
  const result = await leadRefillService.getCurrentLeadCapacity(session.userId);
  if (isErr(result)) {
    throwLeadActionError(fromLeadCapacitySnapshotError(result.error));
  }
  return result.value;
}
