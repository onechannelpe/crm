import { describe, expect, it } from "vitest";
import { createIsolatedTestDb, cleanupTestDb, type TestDbContext } from "../support/test-db";

async function prepareSubmittableNote(ctx: TestDbContext, status: "draft" | "rejected" = "draft") {
    const noteId = await ctx.repos.chargeNotes.create(1, 1);
    if (status === "rejected") {
        await ctx.repos.chargeNotes.updateStatus(noteId, "rejected");
    }

    await ctx.repos.chargeNoteItems.create(noteId, 1, 1);
    await ctx.repos.documents.create({
        charge_note_id: noteId,
        filename: "dni.pdf",
        filepath: `uploads/${noteId}/dni.pdf`,
        mimetype: "application/pdf",
        size: 120_000,
    });

    await ctx.db.insertInto("inventory_items").values({
        id: 1,
        product_id: 1,
        serial_number: "SN-TEST-001",
        status: "available",
        created_at: Date.now(),
    }).execute();

    const reserved = await ctx.repos.inventory.reserveIfAvailable(1);
    expect(reserved).toBe(true);
    await ctx.repos.inventory.createLock(1, noteId, Date.now() + 30 * 60 * 1000);

    return noteId;
}

describe("sales workflow invariants", () => {
    it("rejects submit when items are missing", async () => {
        const ctx = await createIsolatedTestDb("sales-items");
        try {
            const noteId = await ctx.repos.chargeNotes.create(1, 1);
            const result = await ctx.sales.submit(noteId, 1);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe("At least one product item is required before submission");
            }
        } finally {
            await cleanupTestDb(ctx);
        }
    });

    it("rejects submit when documents are missing", async () => {
        const ctx = await createIsolatedTestDb("sales-docs");
        try {
            const noteId = await ctx.repos.chargeNotes.create(1, 1);
            await ctx.repos.chargeNoteItems.create(noteId, 1, 1);
            const result = await ctx.sales.submit(noteId, 1);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe("At least one document is required before submission");
            }
        } finally {
            await cleanupTestDb(ctx);
        }
    });

    it("rejects submit when inventory lock is missing", async () => {
        const ctx = await createIsolatedTestDb("sales-lock");
        try {
            const noteId = await ctx.repos.chargeNotes.create(1, 1);
            await ctx.repos.chargeNoteItems.create(noteId, 1, 1);
            await ctx.repos.documents.create({
                charge_note_id: noteId,
                filename: "dni.pdf",
                filepath: `uploads/${noteId}/dni.pdf`,
                mimetype: "application/pdf",
                size: 120_000,
            });
            const result = await ctx.sales.submit(noteId, 1);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe("An active inventory lock is required before submission");
            }
        } finally {
            await cleanupTestDb(ctx);
        }
    });

    it("prevents cross-branch approval", async () => {
        const ctx = await createIsolatedTestDb("sales-branch");
        try {
            const noteId = await prepareSubmittableNote(ctx);
            const submitted = await ctx.sales.submit(noteId, 1);
            expect(submitted.ok).toBe(true);

            const result = await ctx.sales.approve(noteId, 4, 2, false);
            expect(result.ok).toBe(false);
            if (!result.ok) {
                expect(result.error).toBe("Cannot review a sale from another branch");
            }
        } finally {
            await cleanupTestDb(ctx);
        }
    });

    it("resolves unresolved rejection logs when resubmitting", async () => {
        const ctx = await createIsolatedTestDb("sales-reject");
        try {
            const noteId = await prepareSubmittableNote(ctx, "rejected");
            await ctx.repos.rejectionLogs.create({
                charge_note_id: noteId,
                reviewer_id: 2,
                field_id: "dni_file",
                reviewer_note: "Unreadable image",
                is_resolved: 0,
                created_at: Date.now(),
            });

            const result = await ctx.sales.submit(noteId, 1);
            expect(result.ok).toBe(true);

            const unresolved = await ctx.repos.rejectionLogs.findUnresolvedByChargeNote(noteId);
            expect(unresolved.length).toBe(0);
        } finally {
            await cleanupTestDb(ctx);
        }
    });

    it("marks inventory sold and clears lock on approval", async () => {
        const ctx = await createIsolatedTestDb("sales-approve");
        try {
            const noteId = await prepareSubmittableNote(ctx);
            const submitted = await ctx.sales.submit(noteId, 1);
            expect(submitted.ok).toBe(true);

            const approved = await ctx.sales.approve(noteId, 2, 1, false);
            expect(approved.ok).toBe(true);

            const lock = await ctx.repos.inventory.findAnyLockByChargeNote(noteId);
            expect(lock).toBeUndefined();

            const item = await ctx.repos.inventory.findById(1);
            expect(item?.status).toBe("sold");
        } finally {
            await cleanupTestDb(ctx);
        }
    });
});
