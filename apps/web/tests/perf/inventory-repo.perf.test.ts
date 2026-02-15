import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cleanupTestDb, createIsolatedTestDb, type TestDbContext } from "../support/test-db";

describe("inventory performance", () => {
    let ctx: TestDbContext;

    beforeEach(async () => {
        ctx = await createIsolatedTestDb("inventory-perf");
    });

    afterEach(async () => {
        await cleanupTestDb(ctx);
    });

    it("releases expired locks in bulk within a performance budget", async () => {
        const now = Date.now();
        for (let i = 1; i <= 300; i++) {
            await ctx.db.insertInto("inventory_items").values({
                id: i,
                product_id: 1,
                serial_number: `SN-PERF-${i}`,
                status: "reserved",
                created_at: now,
            }).execute();

            const noteId = await ctx.repos.chargeNotes.create(1, 1);
            await ctx.repos.inventory.createLock(i, noteId, now - 10);
        }

        const started = Date.now();
        await ctx.repos.inventory.releaseExpiredLocks(now);
        expect(Date.now() - started).toBeLessThan(5000);
    });
});
