import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { downloadSalesExportById } from "../../src/routes/api/sales/reports/exports/[jobId]/download";
import { createSalesExportBlobStore } from "../../src/server/sales/export-blob-store";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("sales export download access", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("sales-export-download-access");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("allows same-branch reviewer and logs download", async () => {
    const now = Date.now();
    const blobStore = createSalesExportBlobStore(ctx.storageRoot);
    await blobStore.put(
      "sales-export-11.csv",
      new TextEncoder().encode("a,b\n1,2\n"),
    );

    const jobId = await ctx.repos.reportExportJobs.createJob({
      requested_by_user_id: 2,
      branch_id: 1,
      format: "csv",
      filters_json: JSON.stringify({ status: "confirmed", scope: "branch" }),
      status: "completed",
      rows_count: 1,
      file_storage_key: "sales-export-11.csv",
      file_sha256: "abc",
      error_message: null,
      requested_at: now,
      completed_at: now,
      expires_at: null,
      lease_owner: null,
      lease_until: null,
      attempt_count: 0,
      max_attempts: 5,
    });

    const response = await downloadSalesExportById(
      jobId,
      { userId: 2, role: "back_office", branchId: 1 },
      { repos: ctx.repos, blobStore, now: () => now + 1 },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/csv");

    const downloads =
      await ctx.repos.reportExportJobs.listDownloadsByJob(jobId);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.downloaded_by_user_id).toBe(2);
  });

  it("denies cross-branch reviewer", async () => {
    const now = Date.now();
    const blobStore = createSalesExportBlobStore(ctx.storageRoot);
    await blobStore.put(
      "sales-export-12.csv",
      new TextEncoder().encode("x,y\n1,2\n"),
    );

    const jobId = await ctx.repos.reportExportJobs.createJob({
      requested_by_user_id: 2,
      branch_id: 1,
      format: "csv",
      filters_json: JSON.stringify({ status: "confirmed", scope: "branch" }),
      status: "completed",
      rows_count: 1,
      file_storage_key: "sales-export-12.csv",
      file_sha256: "abc",
      error_message: null,
      requested_at: now,
      completed_at: now,
      expires_at: null,
      lease_owner: null,
      lease_until: null,
      attempt_count: 0,
      max_attempts: 5,
    });

    await expect(
      downloadSalesExportById(
        jobId,
        { userId: 4, role: "back_office", branchId: 2 },
        { repos: ctx.repos, blobStore },
      ),
    ).rejects.toThrow("Export job not found");

    const downloads =
      await ctx.repos.reportExportJobs.listDownloadsByJob(jobId);
    expect(downloads).toHaveLength(0);
  });

  it("allows superuser cross-branch", async () => {
    const now = Date.now();
    const blobStore = createSalesExportBlobStore(ctx.storageRoot);
    await blobStore.put(
      "sales-export-13.csv",
      new TextEncoder().encode("x,y\n1,2\n"),
    );

    const jobId = await ctx.repos.reportExportJobs.createJob({
      requested_by_user_id: 2,
      branch_id: 1,
      format: "csv",
      filters_json: JSON.stringify({ status: "confirmed", scope: "branch" }),
      status: "completed",
      rows_count: 1,
      file_storage_key: "sales-export-13.csv",
      file_sha256: "abc",
      error_message: null,
      requested_at: now,
      completed_at: now,
      expires_at: null,
      lease_owner: null,
      lease_until: null,
      attempt_count: 0,
      max_attempts: 5,
    });

    const response = await downloadSalesExportById(
      jobId,
      { userId: 5, role: "superuser", branchId: 2 },
      { repos: ctx.repos, blobStore },
    );

    expect(response.status).toBe(200);

    const downloads =
      await ctx.repos.reportExportJobs.listDownloadsByJob(jobId);
    expect(downloads).toHaveLength(1);
    expect(downloads[0]?.downloaded_by_user_id).toBe(5);
  });

  it("fails when file is not ready", async () => {
    const now = Date.now();
    const blobStore = createSalesExportBlobStore(ctx.storageRoot);

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
      lease_owner: "worker",
      lease_until: now + 10_000,
      attempt_count: 0,
      max_attempts: 5,
    });

    await expect(
      downloadSalesExportById(
        jobId,
        { userId: 2, role: "back_office", branchId: 1 },
        { repos: ctx.repos, blobStore },
      ),
    ).rejects.toThrow("Export file is not ready");
  });
});
