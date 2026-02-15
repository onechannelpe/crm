import { describe, expect, it } from "vitest";
import { createIsolatedTestDb, cleanupTestDb } from "../support/test-db";

describe("inventory repository", () => {
    it("reserves an item atomically once", async () => {
        const ctx = await createIsolatedTestDb("inv-atomic");
        try {
            await ctx.db.insertInto("inventory_items").values({
                id: 1,
                product_id: 1,
                serial_number: "SN-1",
                status: "available",
                created_at: Date.now(),
            }).execute();

            const first = await ctx.repos.inventory.reserveIfAvailable(1);
            const second = await ctx.repos.inventory.reserveIfAvailable(1);

            expect(first).toBe(true);
            expect(second).toBe(false);

            const item = await ctx.repos.inventory.findById(1);
            expect(item?.status).toBe("reserved");
        } finally {
            await cleanupTestDb(ctx);
        }
    });

    it("releases expired locks and restores stock", async () => {
        const ctx = await createIsolatedTestDb("inv-expired");
        try {
            const now = Date.now();
            await ctx.db.insertInto("inventory_items").values({
                id: 1,
                product_id: 1,
                serial_number: "SN-2",
                status: "reserved",
                created_at: now,
            }).execute();

            const noteId = await ctx.repos.chargeNotes.create(1, 1);
            await ctx.repos.inventory.createLock(1, noteId, now - 1_000);

            const released = await ctx.repos.inventory.releaseExpiredLocks(now);
            expect(released).toBe(1);

            const lock = await ctx.repos.inventory.findAnyLockByChargeNote(noteId);
            expect(lock).toBeUndefined();

            const item = await ctx.repos.inventory.findById(1);
            expect(item?.status).toBe("available");
        } finally {
            await cleanupTestDb(ctx);
        }
    });

    it("handles bulk expired lock cleanup within reasonable time", async () => {
        const ctx = await createIsolatedTestDb("inv-bulk");
        try {
            const now = Date.now();
            for (let i = 1; i <= 300; i++) {
                await ctx.db.insertInto("inventory_items").values({
                    id: i,
                    product_id: 1,
                    serial_number: `SN-BULK-${i}`,
                    status: "reserved",
                    created_at: now,
                }).execute();

                const noteId = await ctx.repos.chargeNotes.create(1, 1);
                await ctx.repos.inventory.createLock(i, noteId, now - 10);
            }

            const started = Date.now();
            const released = await ctx.repos.inventory.releaseExpiredLocks(now);
            const durationMs = Date.now() - started;

            expect(released).toBe(300);
            expect(durationMs).toBeLessThan(5000);
        } finally {
            await cleanupTestDb(ctx);
        }
    });
});
