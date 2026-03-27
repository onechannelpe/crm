import { describe, expect, it } from "vitest";

import type { Role } from "../../src/lib/auth/access/rbac";
import {
  getSalesExportJobForActor,
  listSalesExportDownloadsForActor,
  listSalesExportJobsForActor,
  type SalesExportServiceDeps,
} from "../../src/server/sales-exports/service";

interface SessionLike {
  userId: number;
  role: Role;
  branchId: number;
}

function buildJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 11,
    requested_by_user_id: 2,
    requested_by_name: "Back 1",
    branch_id: 1,
    format: "csv" as const,
    filters_json: JSON.stringify({ scope: "branch", branchId: 1 }),
    status: "completed" as const,
    rows_count: 7,
    file_storage_key: "k.csv",
    file_sha256: "abc",
    error_message: null,
    requested_at: 10,
    completed_at: 20,
    expires_at: 30,
    ...overrides,
  };
}

function createDeps(
  overrides: {
    listJobs?: SalesExportServiceDeps["reportExportJobs"]["listJobs"];
    findJobById?: (
      jobId: number,
    ) => Promise<ReturnType<typeof buildJob> | null>;
    listDownloadsByJob?: (jobId: number) => Promise<
      Array<{
        id: number;
        export_job_id: number;
        downloaded_by_user_id: number;
        downloaded_by_name: string;
        downloaded_at: number;
      }>
    >;
    findUserById?: (userId: number) => Promise<{
      id: number;
      names: string;
      first_surname: string;
      second_surname: string;
    } | null>;
  } = {},
): SalesExportServiceDeps {
  return {
    reportExportJobs: {
      listJobs: async (limit: number, scope?: { branchId: number }) => {
        if (overrides.listJobs) {
          return overrides.listJobs(limit, scope);
        }
        return [buildJob()];
      },
      findJobById: overrides.findJobById ?? (async () => buildJob()),
      listDownloadsByJob: overrides.listDownloadsByJob ?? (async () => []),
      createJob: async () => 11,
    },
    users: {
      findById:
        overrides.findUserById ??
        (async () => ({
          id: 2,
          names: "Back",
          first_surname: "One",
          second_surname: "",
        })),
    },
  };
}

describe("sales export service branch scope", () => {
  it("lists jobs by branch for non-superusers", async () => {
    let received: { limit: number; scope?: { branchId: number } } | null = null;
    const actor: SessionLike = { userId: 2, role: "back_office", branchId: 1 };
    const jobs = await listSalesExportJobsForActor(
      actor,
      20,
      createDeps({
        listJobs: async (limit: number, scope?: { branchId: number }) => {
          received = { limit, scope };
          return [buildJob()];
        },
      }),
    );

    expect(received).toEqual({ limit: 20, scope: { branchId: 1 } });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe(11);
  });

  it("lists global jobs for superuser", async () => {
    let received: { limit: number; scope?: { branchId: number } } | null = null;
    await listSalesExportJobsForActor(
      { userId: 5, role: "superuser", branchId: 2 },
      20,
      createDeps({
        listJobs: async (limit: number, scope?: { branchId: number }) => {
          received = { limit, scope };
          return [buildJob()];
        },
      }),
    );

    expect(received).toEqual({ limit: 20, scope: undefined });
  });

  it("hides detail for cross-branch non-superuser", async () => {
    const result = await getSalesExportJobForActor(
      { userId: 4, role: "back_office", branchId: 2 },
      11,
      createDeps({
        findJobById: async () => buildJob({ branch_id: 1 }),
      }),
    );

    expect(result).toBeNull();
  });

  it("returns download log only for same branch or superuser", async () => {
    const blocked = await listSalesExportDownloadsForActor(
      { userId: 4, role: "back_office", branchId: 2 },
      11,
      createDeps({
        findJobById: async () => buildJob({ branch_id: 1 }),
      }),
    );
    expect(blocked).toEqual([]);

    const allowed = await listSalesExportDownloadsForActor(
      { userId: 5, role: "superuser", branchId: 2 },
      11,
      createDeps({
        findJobById: async () => buildJob({ branch_id: 1 }),
        listDownloadsByJob: async () => [
          {
            id: 3,
            export_job_id: 11,
            downloaded_by_user_id: 5,
            downloaded_by_name: "Super User",
            downloaded_at: 100,
          },
        ],
      }),
    );

    expect(allowed).toHaveLength(1);
  });

  it("getSalesExportJob returns null and skips user lookup when job is not found", async () => {
    let lookedUpUser = false;
    const result = await getSalesExportJobForActor(
      { userId: 2, role: "back_office", branchId: 1 },
      99,
      createDeps({
        findJobById: async () => null,
        findUserById: async () => {
          lookedUpUser = true;
          return null;
        },
      }),
    );

    expect(result).toBeNull();
    expect(lookedUpUser).toBe(false);
  });

  it("listSalesExportDownloads returns empty and skips query when job is not found", async () => {
    let listedDownloads = false;
    const result = await listSalesExportDownloadsForActor(
      { userId: 2, role: "back_office", branchId: 1 },
      99,
      createDeps({
        findJobById: async () => null,
        listDownloadsByJob: async () => {
          listedDownloads = true;
          return [];
        },
      }),
    );

    expect(result).toEqual([]);
    expect(listedDownloads).toBe(false);
  });
});
