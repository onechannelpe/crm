import type { TestDbContext } from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";

export const LOCK_GROUP_COUNT = 32;
export const LOCKS_PER_GROUP = 12;
const INVENTORY_ID_START = 50_000;
const EXPIRY_BASE = 10_000_000;

export async function seedInventoryReleaseLocks(
  ctx: TestDbContext,
  itemOffset = 0,
): Promise<number[]> {
  const nowValues: number[] = [];

  for (let group = 0; group < LOCK_GROUP_COUNT; group += 1) {
    const expiry = EXPIRY_BASE + group;
    nowValues.push(expiry + 1);

    for (let offset = 0; offset < LOCKS_PER_GROUP; offset += 1) {
      const itemId =
        itemOffset + INVENTORY_ID_START + group * LOCKS_PER_GROUP + offset;

      const noteId = await ctx.repos.chargeNotes.create(1, 1);

      await ctx.db
        .insertInto("inventory_items")
        .values({
          id: itemId,
          product_id: 1,
          serial_number: `SN-LOCK-${itemId}`,
          status: "reserved",
          created_at: BENCH_NOW,
        })
        .execute();

      await ctx.repos.inventory.createLock(itemId, noteId, expiry);
    }
  }

  return nowValues;
}
