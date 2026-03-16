"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { searchAllowanceService } from "~/server/shared/context";
import { asUserId } from "~/server/shared/ids";
import { isErr } from "~/server/shared/result";

import {
  fromSearchAllowanceSnapshotError,
  throwSearchActionError,
} from "./errors";

export async function getMySearchAllowance() {
  const session = await requirePermission("capacity:read:self");
  const userId = asUserId(session.userId);
  const result = await searchAllowanceService.getCurrentSearchAllowance(userId);
  if (isErr(result)) {
    throwSearchActionError(fromSearchAllowanceSnapshotError(result.error));
  }
  return result.value;
}
