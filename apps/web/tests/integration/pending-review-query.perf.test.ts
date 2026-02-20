import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getPendingReviewNotesForSession } from "~/server/sales/pending-review";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import {
  assertPendingReviewRows,
  createPendingReviewWorkload,
  readPendingReviewRows,
  seedPendingReviewWorkload,
} from "../support/pending-review-workload";

describe("pending review query performance", () => {
  const workload = createPendingReviewWorkload(1_200);
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("pending-query-perf");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("loads pending review notes from the action path within a performance budget", async () => {
    await seedPendingReviewWorkload(ctx, workload);
    assertPendingReviewRows(await readPendingReviewRows(ctx), workload);

    const started = Date.now();
    const branchRows = await getPendingReviewNotesForSession(
      { repos: ctx.repos },
      { role: "executive", branchId: 1 },
    );
    const globalRows = await getPendingReviewNotesForSession(
      { repos: ctx.repos },
      { role: "superuser", branchId: 1 },
    );

    expect(branchRows).toHaveLength(workload.expectedBranchOne);
    expect(globalRows).toHaveLength(workload.expectedTotal);
    expect(Date.now() - started).toBeLessThan(5000);
  });
});
