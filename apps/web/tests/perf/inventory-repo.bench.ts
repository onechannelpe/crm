import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("inventory performance", () => {
  let ctx: TestDbContext;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("inventory-bench");

    const now = Date.now();
    await Promise.all(
      Array.from({ length: 300 }, (_, offset) => offset + 1).map(async (id) => {
        await ctx.db
          .insertInto("inventory_items")
          .values({
            id,
            product_id: 1,
            serial_number: `SN-BENCH-${id}`,
            status: "reserved",
            created_at: now,
          })
          .execute();

        const noteId = await ctx.repos.chargeNotes.create(1, 1);
        await ctx.repos.inventory.createLock(id, noteId, now - 10);
      }),
    );
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  bench("releases expired locks in bulk", async () => {
    await ctx.repos.inventory.releaseExpiredLocks(Date.now());
  });
});
