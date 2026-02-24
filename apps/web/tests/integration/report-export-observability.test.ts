import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("report export observability", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("report-export-observability");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("lists confirmed sales by branch scope", async () => {
    const now = Date.now();
    await ctx.db
      .insertInto("charge_notes")
      .values([
        {
          id: 101,
          contact_id: 1,
          user_id: 1,
          status: "confirmed",
          exec_code_real: null,
          exec_code_tdp: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: 202,
          contact_id: 2,
          user_id: 3,
          status: "confirmed",
          exec_code_real: null,
          exec_code_tdp: null,
          created_at: now,
          updated_at: now,
        },
      ])
      .execute();

    const branchOne =
      await ctx.repos.chargeNotes.findConfirmedWithContactsByBranch(1);
    const branchTwo =
      await ctx.repos.chargeNotes.findConfirmedWithContactsByBranch(2);

    expect(branchOne).toHaveLength(1);
    expect(branchOne[0]?.id).toBe(101);
    expect(branchTwo).toHaveLength(1);
    expect(branchTwo[0]?.id).toBe(202);
  });

  it("tracks export jobs and download events", async () => {
    const now = Date.now();
    const jobId = await ctx.repos.reportExportJobs.createJob({
      requested_by_user_id: 2,
      format: "csv",
      filters_json: JSON.stringify({ status: "confirmed", scope: "branch" }),
      status: "queued",
      rows_count: null,
      file_storage_key: null,
      file_sha256: null,
      error_message: null,
      requested_at: now,
      completed_at: null,
      expires_at: null,
    });

    await ctx.repos.reportExportJobs.markJobCompleted(
      jobId,
      9,
      now + 10,
      now + 1000,
    );

    const jobs = await ctx.repos.reportExportJobs.listJobs(10);
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe(jobId);
    expect(jobs[0]?.status).toBe("completed");
    expect(jobs[0]?.rows_count).toBe(9);
    expect(jobs[0]?.requested_by_name).toBe("Back 1");

    await ctx.repos.reportExportJobs.createDownload({
      export_job_id: jobId,
      downloaded_by_user_id: 5,
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
