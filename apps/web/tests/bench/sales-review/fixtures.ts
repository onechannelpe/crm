import { uploadTestPdf } from "../../support/document-fixtures";
import type { TestDbContext } from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";

export const DECISION_POOL_SIZE = 80;
const APPROVE_ITEM_ID_START = 60_000;
const REJECT_ITEM_ID_START = 70_000;

export interface SalesReviewFixtures {
  approveNoteIds: number[];
  rejectNoteIds: number[];
}

export async function seedSalesReviewFixtures(
  ctx: TestDbContext,
): Promise<SalesReviewFixtures> {
  const approveNoteIds: number[] = [];
  const rejectNoteIds: number[] = [];

  for (let index = 0; index < DECISION_POOL_SIZE; index += 1) {
    const approveNoteId = await ctx.repos.chargeNotes.create(1, 1);

    await ctx.repos.chargeNoteItems.create(approveNoteId, 1, 1);

    await uploadTestPdf(ctx, approveNoteId);

    await ctx.db
      .insertInto("inventory_items")
      .values({
        id: APPROVE_ITEM_ID_START + index,
        product_id: 1,
        serial_number: `SN-APPROVE-${APPROVE_ITEM_ID_START + index}`,
        status: "reserved",
        created_at: BENCH_NOW,
      })
      .execute();

    await ctx.repos.inventory.createLock(
      APPROVE_ITEM_ID_START + index,
      approveNoteId,
      BENCH_NOW + 60_000,
    );

    await ctx.repos.chargeNotes.updateStatus(approveNoteId, "pending_review");
    approveNoteIds.push(approveNoteId);

    const rejectNoteId = await ctx.repos.chargeNotes.create(1, 1);

    await ctx.repos.chargeNoteItems.create(rejectNoteId, 1, 1);

    await uploadTestPdf(ctx, rejectNoteId);

    await ctx.db
      .insertInto("inventory_items")
      .values({
        id: REJECT_ITEM_ID_START + index,
        product_id: 1,
        serial_number: `SN-REJECT-${REJECT_ITEM_ID_START + index}`,
        status: "reserved",
        created_at: BENCH_NOW,
      })
      .execute();

    await ctx.repos.inventory.createLock(
      REJECT_ITEM_ID_START + index,
      rejectNoteId,
      BENCH_NOW + 60_000,
    );

    await ctx.repos.chargeNotes.updateStatus(rejectNoteId, "pending_review");
    rejectNoteIds.push(rejectNoteId);
  }

  return { approveNoteIds, rejectNoteIds };
}
