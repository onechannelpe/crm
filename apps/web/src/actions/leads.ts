"use server";

import { leadService } from "~/server/shared/context";
import { requireAuth } from "~/lib/auth/session";
import { isErr } from "~/server/shared/result";
import { config } from "~/lib/config";

export async function requestLeads(bufferSize?: number) {
    const session = await requireAuth();
    const size = bufferSize ?? config.leadAssignment.defaultBufferSize;
    const result = await leadService.requestLeads(session.userId, session.branchId, size);

    if (isErr(result)) throw new Error(result.error);
    return { assigned: result.value };
}

export async function completeLead(assignmentId: number) {
    const session = await requireAuth();
    const result = await leadService.completeLead(session.userId, assignmentId);

    if (isErr(result)) throw new Error(result.error);
    return { success: true };
}
