"use server";

import { requireAuth } from "~/lib/auth/access/session";
import { requirePermission } from "~/lib/auth/access/session";
import { getServerRuntime } from "~/server/runtime";

export interface DashboardStats {
  activeLeads: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await requireAuth();
  await requirePermission("lead:work");

  const { contactAssignments } = getServerRuntime().contactAssignments.repos;
  const activeLeads = await contactAssignments.findActiveByUser(session.userId);

  return {
    activeLeads: activeLeads.length,
  };
}
