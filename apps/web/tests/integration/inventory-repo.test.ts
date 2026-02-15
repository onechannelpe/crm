import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("inventory repository", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("inventory-repo");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("reserves an item atomically once", async () => {
    await ctx.db
      .insertInto("inventory_items")
      .values({
        id: 1,
        product_id: 1,
        serial_number: "SN-1",
        status: "available",
        created_at: Date.now(),
      })
      .execute();

    const first = await ctx.repos.inventory.reserveIfAvailable(1);
    const second = await ctx.repos.inventory.reserveIfAvailable(1);

    expect(first).toBe(true);
    expect(second).toBe(false);

    const item = await ctx.repos.inventory.findById(1);
    expect(item?.status).toBe("reserved");
  });

  it("releases expired locks and restores stock", async () => {
    const now = Date.now();
    await ctx.db
      .insertInto("inventory_items")
      .values({
        id: 1,
        product_id: 1,
        serial_number: "SN-2",
        status: "reserved",
        created_at: now,
      })
      .execute();

    const noteId = await ctx.repos.chargeNotes.create(1, 1);
    await ctx.repos.inventory.createLock(1, noteId, now - 1_000);

    const released = await ctx.repos.inventory.releaseExpiredLocks(now);
    expect(released).toBe(1);

    const lock = await ctx.repos.inventory.findAnyLockByChargeNote(noteId);
    expect(lock).toBeUndefined();

    const item = await ctx.repos.inventory.findById(1);
    expect(item?.status).toBe("available");
  });

  it("handles bulk expired lock cleanup correctly", async () => {
    const now = Date.now();
    await Promise.all(
      Array.from({ length: 300 }, (_, offset) => offset + 1).map(async (id) => {
        await ctx.db
          .insertInto("inventory_items")
          .values({
            id,
            product_id: 1,
            serial_number: `SN-BULK-${id}`,
            status: "reserved",
            created_at: now,
          })
          .execute();

        const noteId = await ctx.repos.chargeNotes.create(1, 1);
        await ctx.repos.inventory.createLock(id, noteId, now - 10);
      }),
    );

    const released = await ctx.repos.inventory.releaseExpiredLocks(now);

    expect(released).toBe(300);
  });
});
