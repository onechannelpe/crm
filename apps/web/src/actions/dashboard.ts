"use server";

import { requireAuth } from "~/lib/auth/access/session";
import { requirePermission } from "~/lib/auth/access/session";
import { serverRuntime } from "~/server/runtime";

export interface DashboardStats {
  activeLeads: number;
  pendingSales: number;
  draftSales: number;
  confirmedSales: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await requireAuth();
  await requirePermission("sales:review");

  const { contactAssignments } = serverRuntime.contactAssignments.read;
  const { salesRecords } = serverRuntime.salesRecords.read.repos;

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
