"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { leadOpsService } from "~/server/shared/context";
import { teamAdminService } from "~/server/shared/context";

export async function getMyLeadCapacity() {
  const session = await requirePermission("leads:read");
  return leadOpsService.getStatus(session.userId);
}

export async function getManagedExecutiveLeadCapacity(userId: number) {
  const session = await requirePermission("team:manage");
  const detail = await teamAdminService.getExecutiveDetail(session, userId);
  return detail.leadStatus;
}
