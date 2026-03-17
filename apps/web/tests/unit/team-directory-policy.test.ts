import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "../../src/lib/auth/access/rbac";
import { Ok } from "../../src/server/shared/result";

const { requirePermissionMock, teamsFindByBranchMock, listPendingInvitesMock } =
  vi.hoisted(() => ({
    requirePermissionMock: vi.fn(),
    teamsFindByBranchMock: vi.fn(),
    listPendingInvitesMock: vi.fn(),
  }));

vi.mock("../../src/lib/auth/access/session", () => ({
  requirePermission: requirePermissionMock,
}));

vi.mock("../../src/server/shared/context", () => ({
  repos: {
    teams: {
      findByBranch: teamsFindByBranchMock,
    },
  },
}));

vi.mock("../../src/actions/team/provisioning", () => ({
  provisioning: {
    listPendingInvites: listPendingInvitesMock,
  },
}));

import { getInviteManagement } from "../../src/actions/team/read";

function setSession(role: Role) {
  requirePermissionMock.mockResolvedValue({
    userId: 7,
    role,
    branchId: 3,
  });
}

describe("invite management query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    teamsFindByBranchMock.mockResolvedValue([{ id: 11, name: "Operaciones" }]);
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

  it("fetches invites and teams for hr", async () => {
    setSession("hr");
    const im = await getInviteManagement();
    expect(teamsFindByBranchMock).toHaveBeenCalledWith(3);
    expect(listPendingInvitesMock).toHaveBeenCalledWith(3);
    expect(im.pendingInvites).toHaveLength(1);
    expect(im.teams).toEqual([{ id: 11, name: "Operaciones" }]);
  });
});
