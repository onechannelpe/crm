"use server";

import { quotaService } from "~/server/shared/context";
import { requireAuth, requireRole } from "~/lib/auth/session";
import { isErr } from "~/server/shared/result";

export async function allocateQuota(executiveId: number, amount: number) {
    const session = await requireRole("supervisor");
    const result = await quotaService.allocate(session.userId, executiveId, amount);

    if (isErr(result)) throw new Error(result.error);
    return { success: true };
}

export async function getQuotaStatus() {
    const session = await requireAuth();
    return quotaService.getStatus(session.userId);
}
