import { beforeEach, describe, expect, it, vi } from "vitest";

import { Ok } from "../../src/server/shared/result";

const { runActionMock, teamsFindByBranchMock, listPendingInvitesMock } =
  vi.hoisted(() => ({
    runActionMock:
      vi.fn<
        (params: {
          execute: (context: {
            actor: { userId: number; role: string; branchId: number };
          }) => Promise<{ value: unknown }>;
        }) => Promise<unknown>
      >(),
    teamsFindByBranchMock:
      vi.fn<() => Promise<Array<{ id: number; name: string }>>>(),
    listPendingInvitesMock: vi.fn<() => Promise<unknown>>(),
  }));

vi.mock("../../src/server/shared/action-runtime", () => ({
  runAction: runActionMock,
}));

vi.mock("../../src/server/team/infrastructure/deps", () => ({
  createTeamDeps: () => ({
    repos: {
      teams: {
        findByBranch: teamsFindByBranchMock,
      },
    },
    createProvisioningService: () => ({
      listPendingInvites: listPendingInvitesMock,
    }),
    enforceInviteCreateRateLimit: vi.fn<() => Promise<void>>(),
    issuePreAuthSession: vi.fn<() => Promise<void>>(),
  }),
}));

import { getInviteManagement } from "../../src/actions/team/read";

describe("invite management query", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runActionMock.mockImplementation(async (params) => {
      const result = await params.execute({
        actor: {
          userId: 7,
          role: "hr",
          branchId: 3,
        },
      });
      return result.value;
    });
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
    const im = await getInviteManagement();
    expect(teamsFindByBranchMock).toHaveBeenCalledWith(3);
    expect(listPendingInvitesMock).toHaveBeenCalledWith(3);
    expect(im.pendingInvites).toHaveLength(1);
    expect(im.teams).toEqual([{ id: 11, name: "Operaciones" }]);
  });
});
