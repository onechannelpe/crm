"use server";

import { salesService } from "~/server/shared/context";
import { requireAuth, requireRole } from "~/lib/auth/session";
import { isErr } from "~/server/shared/result";

export async function createSale(contactId: number) {
    const session = await requireAuth();
    const result = await salesService.createDraft(contactId, session.userId);

    if (isErr(result)) throw new Error(result.error);
    return { id: result.value };
}

export async function submitSale(noteId: number) {
    const session = await requireAuth();
    const result = await salesService.submit(noteId, session.userId);

    if (isErr(result)) throw new Error(result.error);
    return { success: true };
}

export async function approveSale(noteId: number) {
    const session = await requireRole("supervisor");
    const result = await salesService.approve(noteId, session.userId);

    if (isErr(result)) throw new Error(result.error);
    return { success: true };
}

export async function rejectSale(
    noteId: number,
    rejections: Array<{ field_id: string; reviewer_note: string | null }>,
) {
    const session = await requireRole("supervisor");
    const result = await salesService.reject(noteId, session.userId, rejections);

    if (isErr(result)) throw new Error(result.error);
    return { success: true };
}
