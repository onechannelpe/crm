"use server";

import { requireAuth } from "~/lib/auth/access/session";
import { requirePermission } from "~/lib/auth/access/session";
import { getServerRuntime } from "~/server/runtime";

export interface DashboardStats {
  activeLeads: number;
  pendingSales: number;
  draftSales: number;
  confirmedSales: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await requireAuth();
  await requirePermission("sales:review");

  const { contactAssignments } = getServerRuntime().contactAssignments.read;
  const { salesRecords } = getServerRuntime().salesRecords.read.repos;

  const activeLeads = await contactAssignments.findActiveByUser(session.userId);
  const pendingSalesCount = await salesRecords.countByExecutiveAndStatus(
    session.userId,
    "submitted_for_confirmation",
  );
  const draftSalesCount = await salesRecords.countByExecutiveAndStatus(
    session.userId,
    "draft",
  );
  const confirmedSalesCount = await salesRecords.countByExecutiveAndStatus(
    session.userId,
    "confirmed",
  );

  return {
    activeLeads: activeLeads.length,
    pendingSales: pendingSalesCount,
    draftSales: draftSalesCount,
    confirmedSales: confirmedSalesCount,
  };
}
