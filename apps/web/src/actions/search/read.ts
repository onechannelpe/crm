"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { searchReadService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { throwSearchActionError } from "./errors";

export async function getMySearchAllowance() {
  const session = await requirePermission("capacity:read:self");
  const result = await searchReadService.getMySearchSnapshot(session.userId);
  if (isErr(result)) {
    if (result.error.reason === "user_not_found") {
      throwSearchActionError({
        reason: "not_found",
        message: result.error.message,
      });
    }
    throwSearchActionError({
      reason: "unexpected",
      message: result.error.message,
    });
  }
  return result.value;
}
