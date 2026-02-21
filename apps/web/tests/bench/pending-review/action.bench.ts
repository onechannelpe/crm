import { afterAll, beforeAll, bench, describe } from "vitest";

import { getPendingReviewNotesForSession } from "~/server/sales/pending-review";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { fixedIterations } from "../_shared/options";
import {
  pendingReviewWorkload,
  QUERY_ITERATIONS,
  seedPendingReviewFixtures,
} from "./fixtures";

describe("pending review action benchmark", () => {
  let ctx: TestDbContext | null = null;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-pending-review-action");
    await seedPendingReviewFixtures(ctx);
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "action path: executive loads branch queue",
    async () => {
      const rows = await getPendingReviewNotesForSession(
        { repos: ctx!.repos },
        { role: "executive", branchId: 1 },
      );

      if (rows.length !== pendingReviewWorkload.expectedBranchOne) {
        throw new Error(
          `expected ${pendingReviewWorkload.expectedBranchOne} rows, got ${rows.length}`,
        );
      }
    },
    fixedIterations(QUERY_ITERATIONS),
  );
});
