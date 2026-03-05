import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Role } from "../../src/lib/auth/access/rbac";
import { Ok } from "../../src/server/shared/result";

const {
  requirePermissionMock,
  usersFindByBranchMock,
  teamsFindByBranchMock,
  listPendingInvitesMock,
} = vi.hoisted(() => ({
  requirePermissionMock: vi.fn(),
  usersFindByBranchMock: vi.fn(),
  teamsFindByBranchMock: vi.fn(),
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
  },
}));

vi.mock("../../src/actions/team/provisioning", () => ({
  provisioning: {
    listPendingInvites: listPendingInvitesMock,
  },
}));

import {
  getInviteManagement,
  getTeamMembers,
} from "../../src/actions/team/read";

function setSession(role: Role) {
  requirePermissionMock.mockResolvedValue({
    userId: 7,
    role,
    branchId: 3,
  });
}

describe("team members query", () => {
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
  });

  it("fetches only members — no invite queries touched", async () => {
    setSession("sales_manager");
    const members = await getTeamMembers();
    expect(usersFindByBranchMock).toHaveBeenCalledWith(3);
    expect(members).toHaveLength(1);
    expect(listPendingInvitesMock).not.toHaveBeenCalled();
    expect(teamsFindByBranchMock).not.toHaveBeenCalled();
  });
});

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
