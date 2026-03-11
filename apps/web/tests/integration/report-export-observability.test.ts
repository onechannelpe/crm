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
      .insertInto("sales_records")
      .values([
        {
          id: 101,
          source: "manual",
          status: "confirmed",
          executive_user_id: 1,
          lead_assignment_id: null,
          branch_id: 1,
          submitted_at: now - 100,
          confirmed_at: now - 50,
          rejected_at: null,
          cancelled_at: null,
          created_at: now,
          updated_at: now,
        },
        {
          id: 202,
          source: "manual",
          status: "confirmed",
          executive_user_id: 3,
          lead_assignment_id: null,
          branch_id: 2,
          submitted_at: now - 100,
          confirmed_at: now - 50,
          rejected_at: null,
          cancelled_at: null,
          created_at: now,
          updated_at: now,
        },
      ])
      .execute();
    await ctx.db
      .insertInto("sales_record_client")
      .values([
        {
          sales_record_id: 101,
          ruc: "20100000001",
          company_name: "Org Lima",
          contact_name: "Contacto Lima",
          dni: "70000001",
          phones_json: "[]",
          engine_match_id: null,
          completeness_score: 80,
          created_at: now,
          updated_at: now,
        },
        {
          sales_record_id: 202,
          ruc: "20100000002",
          company_name: "Org Norte",
          contact_name: "Contacto Norte",
          dni: "70000002",
          phones_json: "[]",
          engine_match_id: null,
          completeness_score: 80,
          created_at: now,
          updated_at: now,
        },
      ])
      .execute();

    const branchOne = await ctx.repos.salesRecords.listConfirmedWithClient({
      branchId: 1,
    });
    const branchTwo = await ctx.repos.salesRecords.listConfirmedWithClient({
      branchId: 2,
    });

    expect(branchOne).toHaveLength(1);
    expect(branchOne[0]?.id).toBe(101);
    expect(branchTwo).toHaveLength(1);
    expect(branchTwo[0]?.id).toBe(202);
  });

  it("tracks export jobs and download events", async () => {
    const now = Date.now();
    const jobId = await ctx.repos.reportExportJobs.createJob({
      requested_by_user_id: 2,
      branch_id: 1,
      format: "csv",
      filters_json: JSON.stringify({ status: "confirmed", scope: "branch" }),
      status: "running",
      rows_count: null,
      file_storage_key: null,
      file_sha256: null,
      error_message: null,
      requested_at: now,
      completed_at: null,
      expires_at: null,
      lease_owner: "test-worker",
      lease_until: now + 1_000,
      attempt_count: 0,
      max_attempts: 5,
    });

    await ctx.repos.reportExportJobs.markJobCompleted(
      jobId,
      "test-worker",
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
