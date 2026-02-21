import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { DECISION_POOL_SIZE, seedSalesReviewFixtures } from "./fixtures";

describe("sales review action benchmark", () => {
  let ctx: TestDbContext | null = null;
  let approveNoteIds: number[] = [];
  let rejectNoteIds: number[] = [];
  const approveCursor = { value: 0 };
  const rejectCursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-sales-review-action");
    const fixtures = await seedSalesReviewFixtures(ctx);
    approveNoteIds = fixtures.approveNoteIds;
    rejectNoteIds = fixtures.rejectNoteIds;
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "action path: approve pending sale",
    async () => {
      const noteId = takeFromPool(
        approveNoteIds,
        approveCursor,
        "sales-review approve pool exhausted before iterations completed",
      );

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
      const noteId = takeFromPool(
        rejectNoteIds,
        rejectCursor,
        "sales-review reject pool exhausted before iterations completed",
      );

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
