import { afterAll, beforeAll, bench, describe } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { DECISION_POOL_SIZE, seedSalesReviewFixtures } from "./fixtures";

describe("sales review component benchmark", () => {
  let ctx: TestDbContext | null = null;
  let approveNoteIds: number[] = [];
  const queryCursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-sales-review-component");
    const fixtures = await seedSalesReviewFixtures(ctx);
    approveNoteIds = fixtures.approveNoteIds;
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "component path: load pending note with owner branch",
    async () => {
      const noteId = takeFromPool(
        approveNoteIds,
        queryCursor,
        "sales-review query pool exhausted before iterations completed",
      );

      const note = await ctx!.repos.chargeNotes.findByIdWithOwner(noteId);
      if (!note) {
        throw new Error("expected pending note row with owner");
      }
    },
    fixedIterations(DECISION_POOL_SIZE),
  );
});
