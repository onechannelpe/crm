"use server";

import { repos } from "~/server/shared/context";
import { requireAuth } from "~/lib/auth/session";

export async function getDashboardStats() {
    const session = await requireAuth();

    const activeLeads = await repos.leadAssignments.findActiveByUser(session.userId);
    const pendingSalesCount = await repos.chargeNotes.countByUserAndStatus(session.userId, "pending_review");
    const draftSalesCount = await repos.chargeNotes.countByUserAndStatus(session.userId, "draft");
    const approvedSalesCount = await repos.chargeNotes.countByUserAndStatus(session.userId, "approved");

    return {
        activeLeads: activeLeads.length,
        pendingSales: pendingSalesCount,
        draftSales: draftSalesCount,
        approvedSales: approvedSalesCount,
    };
}
