import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "../../src/lib/auth/access/rbac";
import { Ok } from "../../src/server/shared/result";

const {
  requirePermissionMock,
  usersFindByBranchMock,
  teamsFindByBranchMock,
  branchesFindByIdMock,
  listPendingInvitesMock,
} = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
  usersFindByBranchMock: vi.fn(),
  teamsFindByBranchMock: vi.fn(),
  branchesFindByIdMock: vi.fn(),
  listPendingInvitesMock: vi.fn(),
}));

vi.mock("../../src/lib/auth/access/session", () => ({
  requirePermission: requirePermissionMock,
}));

vi.mock("../../src/server/shared/context", () => ({
  repos: {
    users: {
      findByBranch: usersFindByBranchMock,
    },
    teams: {
      findByBranch: teamsFindByBranchMock,
    },
    branches: {
      findById: branchesFindByIdMock,
    },
  },
}));

vi.mock("../../src/actions/team/provisioning", () => ({
  provisioning: {
    listPendingInvites: listPendingInvitesMock,
  },
}));

import { getTeamDirectory } from "../../src/actions/team/read";

function setSession(role: Role) {
  requirePermissionMock.mockResolvedValue({
    userId: 7,
    role,
    branchId: 3,
  });
}

describe("team directory invite policy", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    usersFindByBranchMock.mockResolvedValue([
      {
        id: 41,
        full_name: "HR User",
        email: "hr@crm.local",
        role: "hr",
        team_id: 11,
        is_active: 1,
      },
    ]);

    teamsFindByBranchMock.mockResolvedValue([{ id: 11, name: "Operaciones" }]);
    branchesFindByIdMock.mockResolvedValue({ id: 3, name: "Lima" });
    listPendingInvitesMock.mockResolvedValue(
      Ok([
        {
          inviteId: 1001,
          userId: 91,
          email: "pending@crm.local",
          fullName: "Pending User",
          role: "executive",
          teamId: null,
          expiresAt: Date.now() + 60_000,
          createdAt: Date.now(),
          createdByUserId: 7,
          sentAt: Date.now(),
        },
      ]),
    );
  });

  it("does not expose invite management to non-hr roles", async () => {
    setSession("sales_manager");

    const snapshot = await getTeamDirectory();

    expect(snapshot.inviteManagement).toBeNull();
    expect(listPendingInvitesMock).not.toHaveBeenCalled();
    expect(teamsFindByBranchMock).not.toHaveBeenCalled();
    expect(branchesFindByIdMock).not.toHaveBeenCalled();
  });

  it("returns pending invites for hr roles", async () => {
    setSession("hr");

    const snapshot = await getTeamDirectory();

    expect(listPendingInvitesMock).toHaveBeenCalledWith(3);
    expect(snapshot.inviteManagement).not.toBeNull();
    expect(snapshot.inviteManagement?.pendingInvites).toHaveLength(1);
    expect(snapshot.inviteManagement?.inviteLink.status).toBe("unavailable");
  });
});
