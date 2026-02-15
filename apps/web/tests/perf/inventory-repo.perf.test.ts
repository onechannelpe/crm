import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

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
    await Promise.all(
      Array.from({ length: 300 }, (_, offset) => offset + 1).map(async (id) => {
        await ctx.db
          .insertInto("inventory_items")
          .values({
            id,
            product_id: 1,
            serial_number: `SN-PERF-${id}`,
            status: "reserved",
            created_at: now,
          })
          .execute();

        const noteId = await ctx.repos.chargeNotes.create(1, 1);
        await ctx.repos.inventory.createLock(id, noteId, now - 10);
      }),
    );

    const started = Date.now();
    await ctx.repos.inventory.releaseExpiredLocks(now);
    expect(Date.now() - started).toBeLessThan(5000);
  });
});
