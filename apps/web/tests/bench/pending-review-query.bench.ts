import { afterAll, beforeAll, bench, describe } from "vitest";

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
  let actionCtx: TestDbContext | null = null;
  let componentCtx: TestDbContext | null = null;

  beforeAll(async () => {
    actionCtx = await createIsolatedTestDb("pending-action-bench");
    await seedPendingReviewWorkload(actionCtx, workload);
    assertPendingReviewRows(await readPendingReviewRows(actionCtx), workload);

    componentCtx = await createIsolatedTestDb("pending-component-bench");
    await seedPendingReviewWorkload(componentCtx, workload);
    assertPendingReviewRows(
      await readPendingReviewRows(componentCtx),
      workload,
    );
  });

  afterAll(async () => {
    if (actionCtx) {
      await cleanupTestDb(actionCtx);
      actionCtx = null;
    }
    if (componentCtx) {
      await cleanupTestDb(componentCtx);
      componentCtx = null;
    }
  });

  bench("action path: executive loads branch-scoped queue", async () => {
    const rows = await getPendingReviewNotesForSession(
      { repos: actionCtx!.repos },
      { role: "executive", branchId: 1 },
    );
    if (rows.length !== workload.expectedBranchOne) {
      throw new Error(
        `expected ${workload.expectedBranchOne} rows, got ${rows.length}`,
      );
    }
  });

  bench("component path: branch query", async () => {
    const rows =
      await componentCtx!.repos.chargeNotes.findPendingReviewWithContactsByBranch(
        1,
      );
    if (rows.length !== workload.expectedBranchOne) {
      throw new Error(
        `expected ${workload.expectedBranchOne} rows, got ${rows.length}`,
      );
    }
  });
});
