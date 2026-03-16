"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { leadRefillService } from "~/server/shared/context";
import { asUserId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import { fromLeadCapacitySnapshotError, throwLeadActionError } from "./errors";

export async function getMyLeadCapacity() {
  const session = await requirePermission("capacity:read:self");
  const result = await leadRefillService.getCurrentLeadCapacity(
    asUserId(session.userId),
  );
  if (isErr(result)) {
    throwLeadActionError(fromLeadCapacitySnapshotError(result.error));
  }
  return result.value;
}
