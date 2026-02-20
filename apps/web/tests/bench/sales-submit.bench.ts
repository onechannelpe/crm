import { afterAll, beforeAll, bench, describe } from "vitest";

import { canTransition } from "~/server/sales/domain";

import { uploadTestPdf } from "../support/document-fixtures";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import { fixedIterations } from "./shared";

const SALES_SUBMIT_POOL_SIZE = 96;
const SALES_INVENTORY_ID_START = 20_000;

describe("sales workflow performance", () => {
  let ctx: TestDbContext | null = null;
  let noteIds: number[] = [];
  let noteCursor = 0;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("sales-submit-bench");
    const benchCtx = ctx;
    if (!benchCtx) {
      throw new Error("expected benchmark db context");
    }

    const seededNoteIds: number[] = [];
    for (let i = 0; i < SALES_SUBMIT_POOL_SIZE; i += 1) {
      // oxlint-disable-next-line eslint(no-await-in-loop)
      const noteId = await benchCtx.repos.chargeNotes.create(1, 1);
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await benchCtx.repos.chargeNoteItems.create(noteId, 1, 1);
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await uploadTestPdf(benchCtx, noteId);

      const inventoryId = SALES_INVENTORY_ID_START + i;
      // oxlint-disable-next-line eslint(no-await-in-loop)
      await benchCtx.db
        .insertInto("inventory_items")
        .values({
          id: inventoryId,
          product_id: 1,
          serial_number: `SN-BENCH-${inventoryId}`,
          status: "available",
          created_at: Date.now(),
        })
        .execute();

      // oxlint-disable-next-line eslint(no-await-in-loop)
      const reserved = await benchCtx.repos.inventory.reserveIfAvailable(
        inventoryId,
      );
      if (!reserved) {
        throw new Error("expected seeded inventory to be reserved");
      }

      // oxlint-disable-next-line eslint(no-await-in-loop)
      await benchCtx.repos.inventory.createLock(
        inventoryId,
        noteId,
        Date.now() + 30 * 60_000,
      );
      seededNoteIds.push(noteId);
    }
    noteIds = seededNoteIds;
  });

  afterAll(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  bench(
    "action path: submit sale for review",
    async () => {
      const noteId = noteIds[noteCursor];
      noteCursor += 1;
      if (noteId === undefined) {
        throw new Error("benchmark pool exhausted before iterations completed");
      }

      const result = await ctx!.sales.submit(noteId, 1);
      if (!result.ok) {
        throw new Error(`expected submit success, got ${result.error}`);
      }
    },
    fixedIterations(SALES_SUBMIT_POOL_SIZE),
  );

  bench(
    "component path: evaluate sales transition rules",
    () => {
      const canSubmitDraft = canTransition("draft", "pending_review");
      const canApproveDraft = canTransition("draft", "approved");
      if (!canSubmitDraft || canApproveDraft) {
        throw new Error("unexpected sales transition result");
      }
    },
    fixedIterations(20_000),
  );
});
