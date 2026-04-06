"use server";

import { requireAuth } from "~/lib/auth/access/session";
import { requirePermission } from "~/lib/auth/access/session";
import { db } from "~/lib/db/db";
import { createContactAssignmentsRepo } from "~/server/contacts/repos-assignments";
import { createSalesRecordsRepo } from "~/server/sales/repos-sales-records";

const contactAssignments = createContactAssignmentsRepo(db);
const salesRecords = createSalesRecordsRepo(db);

export interface DashboardStats {
  activeLeads: number;
  pendingSales: number;
  draftSales: number;
  confirmedSales: number;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const session = await requireAuth();
  await requirePermission("sales:review");

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
