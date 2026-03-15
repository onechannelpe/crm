"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { leadReadService } from "~/server/shared/context";

export async function getMyLeadCapacity() {
  const session = await requirePermission("capacity:read:self");
  return leadReadService.getMyLeadSnapshot(session.userId);
}
