import { bench, describe } from "vitest";

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
} from "./workloads/pending-review-workload";

describe("pending review query performance", () => {
  const workload = createPendingReviewWorkload(1_200);
  let actionCtx: TestDbContext | null = null;
  let componentCtx: TestDbContext | null = null;

  bench(
    "action path: executive loads branch-scoped queue",
    async () => {
      if (!actionCtx) {
        throw new Error("action benchmark context is not initialized");
      }
      const rows = await getPendingReviewNotesForSession(
        { repos: actionCtx.repos },
        { role: "executive", branchId: 1 },
      );
      if (rows.length !== workload.expectedBranchOne) {
        throw new Error(
          `expected ${workload.expectedBranchOne} rows, got ${rows.length}`,
        );
      }
    },
    {
      throws: true,
      setup: async () => {
        actionCtx = await createIsolatedTestDb("pending-action-bench");
        await seedPendingReviewWorkload(actionCtx, workload);
        assertPendingReviewRows(
          await readPendingReviewRows(actionCtx),
          workload,
        );
      },
      teardown: async () => {
        if (!actionCtx) return;
        await cleanupTestDb(actionCtx);
        actionCtx = null;
      },
    },
  );

  bench(
    "component path: branch query",
    async () => {
      if (!componentCtx) {
        throw new Error("component benchmark context is not initialized");
      }
      const rows =
        await componentCtx.repos.chargeNotes.findPendingReviewWithContactsByBranch(
          1,
        );
      if (rows.length !== workload.expectedBranchOne) {
        throw new Error(
          `expected ${workload.expectedBranchOne} rows, got ${rows.length}`,
        );
      }
    },
    {
      throws: true,
      setup: async () => {
        componentCtx = await createIsolatedTestDb("pending-component-bench");
        await seedPendingReviewWorkload(componentCtx, workload);
        assertPendingReviewRows(
          await readPendingReviewRows(componentCtx),
          workload,
        );
      },
      teardown: async () => {
        if (!componentCtx) return;
        await cleanupTestDb(componentCtx);
        componentCtx = null;
      },
    },
  );
});
