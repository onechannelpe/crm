import { uploadTestPdf } from "../../support/document-fixtures";
import type { TestDbContext } from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";

export const NOTE_POOL_SIZE = 96;
const INVENTORY_ID_START = 20_000;
const LOCK_EXPIRY = 4_000_000_000_000;

export async function seedSalesSubmitNotes(
  ctx: TestDbContext,
): Promise<number[]> {
  const noteIds: number[] = [];

  for (let index = 0; index < NOTE_POOL_SIZE; index += 1) {
    const noteId = await ctx.repos.chargeNotes.create(1, 1);

    await ctx.repos.chargeNoteItems.create(noteId, 1, 1);

    await uploadTestPdf(ctx, noteId);

    const inventoryId = INVENTORY_ID_START + index;

    await ctx.db
      .insertInto("inventory_items")
      .values({
        id: inventoryId,
        product_id: 1,
        serial_number: `SN-SUBMIT-${inventoryId}`,
        status: "available",
        created_at: BENCH_NOW,
      })
      .execute();

    let reserved = false;

    reserved = await ctx.repos.inventory.reserveIfAvailable(inventoryId);
    if (!reserved) {
      throw new Error("expected seeded inventory to be reserved");
    }

    await ctx.repos.inventory.createLock(inventoryId, noteId, LOCK_EXPIRY);
    noteIds.push(noteId);
  }

  return noteIds;
}
