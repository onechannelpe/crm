import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { asUserId } from "../../src/server/shared/ids";
import {
  ISOLATED_DB_IDENTITIES,
  TEST_IDS,
} from "../support/identities/seeded-identities";
import { createSalesTestKit } from "../support/sales-test-kit";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("report export observability", () => {
  let ctx: TestDbContext;
  let kit: ReturnType<typeof createSalesTestKit>;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("report-export-observability");
    kit = createSalesTestKit(ctx);
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("lists confirmed sales by branch scope", async () => {
    const branch1 = TEST_IDS.BRANCH_LIMA;
    const branch2 = TEST_IDS.BRANCH_NORTE;

    await kit.setupConfirmedSale({
      id: 101,
      branchId: branch1,
      executiveUserId: ISOLATED_DB_IDENTITIES.execOne.userId,
      companyName: "Org Lima",
    });

    await kit.setupConfirmedSale({
      id: 202,
      branchId: branch2,
      executiveUserId: ISOLATED_DB_IDENTITIES.execTwo.userId,
      companyName: "Org Norte",
    });

    const branchOneResults =
      await ctx.repos.salesRecords.listConfirmedWithClient({
        branchId: branch1,
      });
    const branchTwoResults =
      await ctx.repos.salesRecords.listConfirmedWithClient({
        branchId: branch2,
      });

    expect(branchOneResults).toHaveLength(1);
    expect(branchOneResults[0]?.id).toBe(101);
    expect(branchTwoResults).toHaveLength(1);
    expect(branchTwoResults[0]?.id).toBe(202);
  });

  it("tracks export jobs and download events", async () => {
    const now = Date.now();
    const jobId = await kit.createExportJob({
      requestedByUserId: ISOLATED_DB_IDENTITIES.backOne.userId,
      branchId: TEST_IDS.BRANCH_LIMA,
    });

    await ctx.repos.reportExportJobs.markJobCompleted(
      jobId,
      asUserId("test-worker"),
      9,
      "sales-export-1.csv",
      "abc123",
      now + 10,
      now + 1000,
    );

    const jobs = await ctx.repos.reportExportJobs.listJobs(10);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe(jobId);
    expect(jobs[0]?.status).toBe("completed");
    expect(jobs[0]?.rows_count).toBe(9);
    expect(jobs[0]?.requested_by_name).toBe("Back One");

    await ctx.repos.reportExportJobs.createDownload({
      export_job_id: jobId,
      downloaded_by_user_id: ISOLATED_DB_IDENTITIES.superuser.userId,
      downloaded_at: now + 50,
      ip_hash: null,
      user_agent_hash: null,
    });

    const downloads =
      await ctx.repos.reportExportJobs.listDownloadsByJob(jobId);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.downloaded_by_name).toBe("Super User");
  });
});
