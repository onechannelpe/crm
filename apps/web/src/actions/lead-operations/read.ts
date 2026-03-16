"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { leadRefillService } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { throwLeadActionError } from "./errors";

export async function getMyLeadCapacity() {
  const session = await requirePermission("capacity:read:self");
  const result = await leadRefillService.getCurrentLeadCapacity(session.userId);
  if (isErr(result)) {
    if (result.error.reason === "user_not_found") {
      throwLeadActionError({
        reason: "not_found",
        message: result.error.message,
      });
    }
    throwLeadActionError({
      reason: "unexpected",
      message: result.error.message,
    });
  }
  return result.value;
}
