import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { createSalesExportQueue } from "../../src/server/sales/queue/sales-export-queue";
import {
  createTestRuntime,
  type TestRuntime,
} from "../support/runtime/create-test-runtime";

describe("sales export service", () => {
  let runtime: TestRuntime;

  beforeEach(async () => {
    runtime = await createTestRuntime("sales-export-service");
  });

  afterEach(async () => {
    await runtime.dispose();
  });

  it("processes queued jobs and stores a real xlsx artifact", async () => {
    const now = Date.now();
    await runtime.ctx.db
      .insertInto("sales_records")
      .values({
        id: 501,
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
      })
      .execute();

    await runtime.ctx.db
      .insertInto("sales_record_client")
      .values({
        sales_record_id: 501,
        ruc: "20100000001",
        company_name: "Org Lima",
        contact_name: "Contacto Lima",
        dni: "70000001",
        phones_json: "[]",
        engine_match_id: null,
        completeness_score: 90,
        created_at: now,
        updated_at: now,
      })
      .execute();

    const jobId = await runtime.ctx.repos.reportExportJobs.createJob({
      requested_by_user_id: 2,
      branch_id: 1,
      format: "xlsx",
      filters_json: JSON.stringify({
        status: "confirmed",
        scope: "branch",
        branchId: 1,
      }),
      status: "queued",
      rows_count: null,
      file_storage_key: null,
      file_sha256: null,
      error_message: null,
      requested_at: now,
      completed_at: null,
      expires_at: null,
      lease_owner: null,
      lease_until: null,
      attempt_count: 0,
      max_attempts: 5,
    });

    const queue = createSalesExportQueue("test-worker", {
      service: runtime.sales.salesExportService,
      leaseMs: 30_000,
      batchSize: 10,
    });
    await queue.runOnce();

    const job = await runtime.ctx.repos.reportExportJobs.findJobById(jobId);
    if (job == null) throw new Error("expected job to exist");
    expect(job.status).toBe("completed");
    expect(job.rows_count).toBe(1);
    expect(job.file_storage_key).toMatch(/\.xlsx$/);
    expect(job.file_sha256).toMatch(/^[a-f0-9]{64}$/);

    if (job.file_storage_key == null)
      throw new Error("expected file_storage_key to be set");
    const file = await runtime.sales.salesExportBlobStore.get(
      job.file_storage_key,
    );
    const signature = String.fromCharCode(file[0] ?? 0, file[1] ?? 0);
    expect(signature).toBe("PK");
  });

  it("does not lease the same job while lease is active", async () => {
    const now = Date.now();
    await runtime.ctx.repos.reportExportJobs.createJob({
      requested_by_user_id: 2,
      branch_id: 1,
      format: "csv",
      filters_json: JSON.stringify({
        status: "confirmed",
        scope: "branch",
        branchId: 1,
      }),
      status: "queued",
      rows_count: null,
      file_storage_key: null,
      file_sha256: null,
      error_message: null,
      requested_at: now,
      completed_at: null,
      expires_at: null,
      lease_owner: null,
      lease_until: null,
      attempt_count: 0,
      max_attempts: 5,
    });

    const firstLease = await runtime.ctx.repos.reportExportJobs.leaseQueuedJobs(
      10,
      30_000,
      "worker-a",
    );
    const secondLease =
      await runtime.ctx.repos.reportExportJobs.leaseQueuedJobs(
        10,
        30_000,
        "worker-b",
      );

    expect(firstLease).toHaveLength(1);
    expect(secondLease).toHaveLength(0);
  });

  it("expires completed jobs and removes stored artifacts", async () => {
    const now = Date.now();
    const blobStore = runtime.sales.salesExportBlobStore;
    const service = runtime.sales.salesExportService;

    const storageKey = "sales-export-expire-test.csv";
    await blobStore.put(storageKey, new TextEncoder().encode("a,b\n1,2\n"));

    const jobId = await runtime.ctx.repos.reportExportJobs.createJob({
      requested_by_user_id: 2,
      branch_id: 1,
      format: "csv",
      filters_json: JSON.stringify({
        status: "confirmed",
        scope: "branch",
        branchId: 1,
      }),
      status: "completed",
      rows_count: 1,
      file_storage_key: storageKey,
      file_sha256: "abc123",
      error_message: null,
      requested_at: now - 1_000,
      completed_at: now - 900,
      expires_at: now - 1,
      lease_owner: null,
      lease_until: null,
      attempt_count: 0,
      max_attempts: 5,
    });

    const expired = await service.expireCompleted(10);
    expect(expired).toBe(1);

    const job = await runtime.ctx.repos.reportExportJobs.findJobById(jobId);
    expect(job?.status).toBe("expired");
    expect(job?.file_storage_key).toBeNull();
    expect(job?.file_sha256).toBeNull();

    await expect(blobStore.get(storageKey)).rejects.toBeTruthy();
  });
});
