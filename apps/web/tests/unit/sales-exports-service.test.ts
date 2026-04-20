import { describe, expect, it } from "vitest";

import type { Role } from "../../src/lib/auth/access/rbac";
import {
  getSalesExportJobForActor,
  listSalesExportDownloadsForActor,
  listSalesExportJobsForActor,
  type SalesExportServiceDeps,
} from "../../src/server/sales-exports/service";
import {
  asUserId,
  asBranchId,
  type UserId,
  type BranchId,
} from "../../src/server/shared/ids";

interface SessionLike {
  userId: UserId;
  role: Role;
  branchId: BranchId;
}

function buildJob(overrides: Record<string, unknown> = {}) {
  return {
    id: 11,
    requested_by_user_id: asUserId("2"),
    requested_by_name: "Back 1",
    branch_id: asBranchId("1"),
    format: "csv" as const,
    filters_json: JSON.stringify({
      scope: "branch",
      branchId: asBranchId("1"),
    }),
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
        downloaded_by_user_id: UserId;
        downloaded_by_name: string;
        downloaded_at: number;
      }>
    >;
    findUserById?: (userId: UserId) => Promise<{
      id: UserId;
      names: string;
      first_surname: string;
      second_surname: string;
    } | null>;
  } = {},
): SalesExportServiceDeps {
  return {
    reportExportJobs: {
      listJobs: async (limit: number, scope?: { branchId: BranchId }) => {
        if (overrides.listJobs) {
          return overrides.listJobs(limit, scope);
        }
        return [buildJob() as any];
      },
      findJobById: (overrides.findJobById as any) ?? (async () => buildJob()),
      listDownloadsByJob:
        (overrides.listDownloadsByJob as any) ?? (async () => []),
      createJob: async () => 11,
    },
    users: {
      findById:
        overrides.findUserById ??
        (async () => ({
          id: asUserId("2"),
          names: "Back",
          first_surname: "One",
          second_surname: "",
        })),
    },
  };
}

describe("sales export service branch scope", () => {
  it("lists jobs by branch for non-superusers", async () => {
    let received: { limit: number; scope?: { branchId: BranchId } } | null =
      null;
    const actor: SessionLike = {
      userId: asUserId("2"),
      role: "back_office",
      branchId: asBranchId("1"),
    };
    const jobs = await listSalesExportJobsForActor(
      actor,
      20,
      createDeps({
        listJobs: async (limit: number, scope?: { branchId: BranchId }) => {
          received = { limit, scope };
          return [buildJob() as any];
        },
      }),
    );

    expect(received).toEqual({
      limit: 20,
      scope: { branchId: asBranchId("1") },
    });
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe(11);
  });

  it("lists global jobs for superuser", async () => {
    let received: { limit: number; scope?: { branchId: BranchId } } | null =
      null;
    await listSalesExportJobsForActor(
      { userId: asUserId("5"), role: "superuser", branchId: asBranchId("2") },
      20,
      createDeps({
        listJobs: async (limit: number, scope?: { branchId: BranchId }) => {
          received = { limit, scope };
          return [buildJob() as any];
        },
      }),
    );

    expect(received).toEqual({ limit: 20, scope: undefined });
  });

  it("hides detail for cross-branch non-superuser", async () => {
    const result = await getSalesExportJobForActor(
      { userId: asUserId("4"), role: "back_office", branchId: asBranchId("2") },
      11,
      createDeps({
        findJobById: async () =>
          buildJob({ branch_id: asBranchId("1") }) as any,
      }),
    );

    expect(result).toBeNull();
  });

  it("returns download log only for same branch or superuser", async () => {
    const blocked = await listSalesExportDownloadsForActor(
      { userId: asUserId("4"), role: "back_office", branchId: asBranchId("2") },
      11,
      createDeps({
        findJobById: async () =>
          buildJob({ branch_id: asBranchId("1") }) as any,
      }),
    );
    expect(blocked).toEqual([]);

    const allowed = await listSalesExportDownloadsForActor(
      { userId: asUserId("5"), role: "superuser", branchId: asBranchId("2") },
      11,
      createDeps({
        findJobById: async () =>
          buildJob({ branch_id: asBranchId("1") }) as any,
        listDownloadsByJob: async () => [
          {
            id: 3,
            export_job_id: 11,
            downloaded_by_user_id: asUserId("5"),
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
      { userId: asUserId("2"), role: "back_office", branchId: asBranchId("1") },
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
      { userId: asUserId("2"), role: "back_office", branchId: asBranchId("1") },
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
