import { afterAll, beforeAll, bench, describe } from "vitest";

import { uploadTestPdf } from "../support/document-fixtures";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import { fixedIterations } from "./shared";

const DECISION_POOL_SIZE = 80;
const APPROVE_ITEM_ID_START = 60_000;
const REJECT_ITEM_ID_START = 70_000;
const SALES_REVIEW_BENCH_NOW = 1_700_000_000_000;

describe("sales review decision performance", () => {
  let ctx: TestDbContext | null = null;
  let approveNoteIds: number[] = [];
  let rejectNoteIds: number[] = [];
  let approveCursor = 0;
  let rejectCursor = 0;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("sales-review-decisions-bench");
    const benchCtx = ctx;
    if (!benchCtx) {
      throw new Error("expected benchmark db context");
    }

    for (let i = 0; i < DECISION_POOL_SIZE; i += 1) {
      // Seed notes for approve benchmark.
      // oxlint-disable-next-line eslint(no-await-in-loop)
      const approveNoteId = await benchCtx.repos.chargeNotes.create(1, 1);
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await benchCtx.repos.chargeNoteItems.create(approveNoteId, 1, 1);
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await uploadTestPdf(benchCtx, approveNoteId);
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await benchCtx.db
        .insertInto("inventory_items")
        .values({
          id: APPROVE_ITEM_ID_START + i,
          product_id: 1,
          serial_number: `SN-APPROVE-${APPROVE_ITEM_ID_START + i}`,
          status: "reserved",
          created_at: SALES_REVIEW_BENCH_NOW,
        })
        .execute();
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await benchCtx.repos.inventory.createLock(
        APPROVE_ITEM_ID_START + i,
        approveNoteId,
        SALES_REVIEW_BENCH_NOW + 60_000,
      );
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await benchCtx.repos.chargeNotes.updateStatus(
        approveNoteId,
        "pending_review",
      );
      approveNoteIds.push(approveNoteId);

      // Seed notes for reject benchmark.
      // oxlint-disable-next-line eslint(no-await-in-loop)
      const rejectNoteId = await benchCtx.repos.chargeNotes.create(1, 1);
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await benchCtx.repos.chargeNoteItems.create(rejectNoteId, 1, 1);
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await uploadTestPdf(benchCtx, rejectNoteId);
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await benchCtx.db
        .insertInto("inventory_items")
        .values({
          id: REJECT_ITEM_ID_START + i,
          product_id: 1,
          serial_number: `SN-REJECT-${REJECT_ITEM_ID_START + i}`,
          status: "reserved",
          created_at: SALES_REVIEW_BENCH_NOW,
        })
        .execute();
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await benchCtx.repos.inventory.createLock(
        REJECT_ITEM_ID_START + i,
        rejectNoteId,
        SALES_REVIEW_BENCH_NOW + 60_000,
      );
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await benchCtx.repos.chargeNotes.updateStatus(
        rejectNoteId,
        "pending_review",
      );
      rejectNoteIds.push(rejectNoteId);
    }
  });

  afterAll(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  bench(
    "action path: approve pending sale",
    async () => {
      const noteId = approveNoteIds[approveCursor];
      approveCursor += 1;
      if (noteId === undefined) {
        throw new Error("approve pool exhausted before iterations completed");
      }

      const result = await ctx!.sales.approve(noteId, 2, 1, false);
      if (!result.ok) {
        throw new Error(`expected approve success, got ${result.error}`);
      }
    },
    fixedIterations(DECISION_POOL_SIZE),
  );

  bench(
    "action path: reject pending sale",
    async () => {
      const noteId = rejectNoteIds[rejectCursor];
      rejectCursor += 1;
      if (noteId === undefined) {
        throw new Error("reject pool exhausted before iterations completed");
      }

      const result = await ctx!.sales.reject(noteId, 2, 1, false, [
        { field_id: "dni_file", reviewer_note: "Not legible" },
      ]);
      if (!result.ok) {
        throw new Error(`expected reject success, got ${result.error}`);
      }
    },
    fixedIterations(DECISION_POOL_SIZE),
  );
});
