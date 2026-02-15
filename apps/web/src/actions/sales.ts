"use server";

import { salesService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { requirePermission } from "~/lib/auth/session";
import { isErr } from "~/server/shared/result";
import { config } from "~/lib/config";
import { computeLockExpiry } from "~/server/inventory/domain";

export async function createSale(contactId: number) {
    const session = await requirePermission("sales:create");
    const hasLead = await repos.leadAssignments.hasActiveForContact(session.userId, contactId);
    if (!hasLead) {
        throw new Error("You can only create sales from your active assigned leads");
    }

    const result = await salesService.createDraft(contactId, session.userId);

    if (isErr(result)) throw new Error(result.error);
    return { id: result.value };
}

export async function submitSale(noteId: number) {
    const session = await requirePermission("sales:submit");
    const result = await salesService.submit(noteId, session.userId);

    if (isErr(result)) throw new Error(result.error);
    return { success: true };
}

export async function approveSale(noteId: number) {
    const session = await requirePermission("sales:approve");
    const result = await salesService.approve(
        noteId,
        session.userId,
        session.branchId,
        session.role === "superuser",
    );

    if (isErr(result)) throw new Error(result.error);
    return { success: true };
}

export async function rejectSale(
    noteId: number,
    rejections: Array<{ field_id: string; reviewer_note: string | null }>,
) {
    const session = await requirePermission("sales:approve");
    const result = await salesService.reject(
        noteId,
        session.userId,
        session.branchId,
        session.role === "superuser",
        rejections,
    );

    if (isErr(result)) throw new Error(result.error);
    return { success: true };
}

export async function getPendingReviewNotes() {
    const session = await requirePermission("sales:review");
    if (session.role === "superuser") {
        return repos.chargeNotes.findPendingReviewWithContacts();
    }
    return repos.chargeNotes.findPendingReviewWithContactsByBranch(session.branchId);
}

export async function getSaleFixContext(noteId: number) {
    const session = await requirePermission("sales:submit");
    const note = await repos.chargeNotes.findById(noteId);
    if (!note) throw new Error("Charge note not found");
    if (note.user_id !== session.userId) throw new Error("Forbidden");

    const rejections = await repos.rejectionLogs.findUnresolvedByChargeNote(noteId);
    return {
        noteId: note.id,
        status: note.status,
        rejections,
    };
}

export async function getSaleDraftContext(noteId: number) {
    const session = await requirePermission("sales:create");
    const note = await repos.chargeNotes.findById(noteId);
    if (!note) throw new Error("Charge note not found");
    if (note.user_id !== session.userId) throw new Error("Forbidden");

    const [items, documents, inventoryLock] = await Promise.all([
        repos.chargeNoteItems.findByChargeNoteWithProducts(noteId),
        repos.documents.findByChargeNote(noteId),
        repos.inventory.findLockWithItemByChargeNote(noteId),
    ]);

    return {
        noteId,
        status: note.status,
        items,
        documents,
        inventoryLock,
        readiness: {
            hasItems: items.length > 0,
            hasDocuments: documents.length > 0,
            hasInventoryLock: !!inventoryLock && inventoryLock.expires_at > Date.now(),
        },
    };
}

export async function getAvailableProducts() {
    await requirePermission("sales:create");
    return repos.products.findActive();
}

export async function getAvailableInventory() {
    await requirePermission("sales:create");
    await repos.inventory.releaseExpiredLocks();
    return repos.inventory.findAllAvailableWithProduct();
}

export async function addSaleItem(noteId: number, productId: number, quantity: number) {
    const session = await requirePermission("sales:create");
    if (!Number.isFinite(quantity) || quantity < 1) throw new Error("Quantity must be at least 1");

    const note = await repos.chargeNotes.findById(noteId);
    if (!note) throw new Error("Charge note not found");
    if (note.user_id !== session.userId) throw new Error("Forbidden");
    if (note.status !== "draft" && note.status !== "rejected") {
        throw new Error("Items can only be edited for draft or rejected notes");
    }

    const product = await repos.products.findById(productId);
    if (!product || !product.is_active) throw new Error("Product not available");

    await repos.chargeNoteItems.create(noteId, productId, quantity);
    return { success: true };
}

export async function addSaleDocument(noteId: number, filename: string, mimetype: string, size: number) {
    const session = await requirePermission("sales:create");
    const note = await repos.chargeNotes.findById(noteId);
    if (!note) throw new Error("Charge note not found");
    if (note.user_id !== session.userId) throw new Error("Forbidden");
    if (note.status !== "draft" && note.status !== "rejected") {
        throw new Error("Documents can only be edited for draft or rejected notes");
    }

    if (!config.uploads.allowedTypes.includes(mimetype as (typeof config.uploads.allowedTypes)[number])) {
        throw new Error("File type not allowed");
    }
    if (size > config.uploads.maxFileSizeMB * 1024 * 1024) {
        throw new Error(`File too large. Max ${config.uploads.maxFileSizeMB} MB`);
    }

    const safeName = filename.trim().replace(/[^a-zA-Z0-9._-]/g, "_");
    await repos.documents.create({
        charge_note_id: noteId,
        filename: safeName || "document.bin",
        filepath: `uploads/manual/${noteId}/${Date.now()}-${safeName || "document.bin"}`,
        mimetype,
        size,
    });

    return { success: true };
}

export async function lockSaleInventory(noteId: number, inventoryItemId: number) {
    const session = await requirePermission("sales:create");
    const note = await repos.chargeNotes.findById(noteId);
    if (!note) throw new Error("Charge note not found");
    if (note.user_id !== session.userId) throw new Error("Forbidden");
    if (note.status !== "draft" && note.status !== "rejected") {
        throw new Error("Inventory can only be selected for draft or rejected notes");
    }

    await repos.inventory.releaseExpiredLocks();

    const existing = await repos.inventory.findAnyLockByChargeNote(noteId);
    if (existing) {
        await repos.inventory.markAvailable(existing.inventory_item_id);
        await repos.inventory.deleteByChargeNote(noteId);
    }

    const reserved = await repos.inventory.reserveIfAvailable(inventoryItemId);
    if (!reserved) throw new Error("Inventory item is no longer available");

    await repos.inventory.createLock(inventoryItemId, noteId, computeLockExpiry());
    return { success: true };
}
