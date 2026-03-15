"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { teamAdminService } from "~/server/shared/context";
import { searchAccessService } from "~/server/shared/context";

export async function getMySearchAllowance() {
  const session = await requirePermission("client_search:read");
  return searchAccessService.getStatus(session.userId);
}

export async function getManagedExecutiveSearchAllowance(userId: number) {
  const session = await requirePermission("team:manage");
  const detail = await teamAdminService.getExecutiveDetail(session, userId);
  return detail.searchStatus;
}
