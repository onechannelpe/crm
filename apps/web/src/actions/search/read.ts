"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { searchReadService } from "~/server/shared/context";

export async function getMySearchAllowance() {
  const session = await requirePermission("capacity:read:self");
  return searchReadService.getMySearchSnapshot(session.userId);
}
