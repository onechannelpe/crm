import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "../../src/lib/auth/access/rbac";

const {
  requirePermissionMock,
  listJobsMock,
  listJobsByBranchMock,
  findJobByIdMock,
  listDownloadsByJobMock,
  findUserByIdMock,
} = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
  listJobsMock: vi.fn(),
  listJobsByBranchMock: vi.fn(),
  findJobByIdMock: vi.fn(),
  listDownloadsByJobMock: vi.fn(),
  findUserByIdMock: vi.fn(),
}));

vi.mock("../../src/lib/auth/access/session", () => ({
  requirePermission: requirePermissionMock,
}));

vi.mock("../../src/server/shared/context", () => ({
  repos: {
    reportExportJobs: {
      listJobs: listJobsMock,
      listJobsByBranch: listJobsByBranchMock,
      findJobById: findJobByIdMock,
      listDownloadsByJob: listDownloadsByJobMock,
    },
    users: {
      findById: findUserByIdMock,
    },
  },
}));

import {
  getSalesExportJob,
  listSalesExportDownloads,
  listSalesExportJobs,
} from "../../src/actions/sales-exports";

interface SessionLike {
  userId: number;
  role: Role;
  branchId: number;
}

function setSession(session: SessionLike) {
  requirePermissionMock.mockResolvedValue(session);
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

describe("sales export actions branch scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUserByIdMock.mockResolvedValue({ id: 2, full_name: "Back 1" });
  });

  it("lists jobs by branch for non-superusers", async () => {
    setSession({ userId: 2, role: "back_office", branchId: 1 });
    listJobsByBranchMock.mockResolvedValue([buildJob()]);

    const jobs = await listSalesExportJobs(20);

    expect(listJobsByBranchMock).toHaveBeenCalledWith(20, 1);
    expect(listJobsMock).not.toHaveBeenCalled();
    expect(jobs).toHaveLength(1);
    expect(jobs[0]?.id).toBe(11);
  });

  it("lists global jobs for superuser", async () => {
    setSession({ userId: 5, role: "superuser", branchId: 2 });
    listJobsMock.mockResolvedValue([buildJob()]);

    await listSalesExportJobs(20);

    expect(listJobsMock).toHaveBeenCalledWith(20);
    expect(listJobsByBranchMock).not.toHaveBeenCalled();
  });

  it("hides detail for cross-branch non-superuser", async () => {
    setSession({ userId: 4, role: "back_office", branchId: 2 });
    findJobByIdMock.mockResolvedValue(buildJob({ branch_id: 1 }));

    const job = await getSalesExportJob(11);

    expect(job).toBeNull();
    expect(findUserByIdMock).not.toHaveBeenCalled();
  });

  it("returns download log only for same branch or superuser", async () => {
    setSession({ userId: 4, role: "back_office", branchId: 2 });
    findJobByIdMock.mockResolvedValue(buildJob({ branch_id: 1 }));

    const blocked = await listSalesExportDownloads(11);
    expect(blocked).toEqual([]);
    expect(listDownloadsByJobMock).not.toHaveBeenCalled();

    setSession({ userId: 5, role: "superuser", branchId: 2 });
    findJobByIdMock.mockResolvedValue(buildJob({ branch_id: 1 }));
    listDownloadsByJobMock.mockResolvedValue([
      {
        id: 3,
        export_job_id: 11,
        downloaded_by_user_id: 5,
        downloaded_by_name: "Super User",
        downloaded_at: 100,
      },
    ]);

    const allowed = await listSalesExportDownloads(11);
    expect(allowed).toHaveLength(1);
    expect(listDownloadsByJobMock).toHaveBeenCalledWith(11);
  });
});
