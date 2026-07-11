import { describe, expect, it } from "vitest";

import { resolveWorkspaceContext } from "~/lib/auth/access/workspace-context";
import { BranchId, TeamId, UserId } from "~/server/shared/ids";

describe("workspace context resolver", () => {
  it("builds executive context from team and supervisor", () => {
    const context = resolveWorkspaceContext({
      role: "executive",
      userId: UserId.trust("10"),
      branchId: BranchId.trust("1"),
      branchName: "Lima",
      userTeamId: TeamId.trust("3"),
      assignedTeam: {
        id: TeamId.trust("3"),
        name: "Alpha",
        branch_id: BranchId.trust("1"),
      },
      branchSupervisors: [
        { id: "sup-1", user_id: UserId.trust("4"), names: "Diego" },
      ],
      managedTeam: null,
    });

    expect(context.scopeType).toBe("team");
    expect(context.team?.name).toBe("Alpha");
    expect(context.supervisor?.names).toBe("Diego");
  });

  it("fails fast for executive without valid team hierarchy", () => {
    expect(() =>
      resolveWorkspaceContext({
        role: "executive",
        userId: UserId.trust("10"),
        branchId: BranchId.trust("1"),
        branchName: "Lima",
        userTeamId: null,
        assignedTeam: null,
        branchSupervisors: [],
        managedTeam: null,
      }),
    ).toThrow(/misconfigured/i);
  });

  it("returns branch context for supervisor", () => {
    const context = resolveWorkspaceContext({
      role: "supervisor",
      userId: UserId.trust("4"),
      branchId: BranchId.trust("1"),
      branchName: "Lima",
      userTeamId: null,
      assignedTeam: null,
      branchSupervisors: [],
      managedTeam: null,
    });

    expect(context.scopeType).toBe("branch");
    expect(context.branch?.name).toBe("Lima");
    expect(context.supervisor).toBeNull();
  });

  it("returns branch context for admin roles", () => {
    const context = resolveWorkspaceContext({
      role: "admin",
      userId: UserId.trust("1"),
      branchId: BranchId.trust("2"),
      branchName: "Norte",
      userTeamId: null,
      assignedTeam: null,
      branchSupervisors: [],
      managedTeam: null,
    });

    expect(context.scopeType).toBe("branch");
    expect(context.branch?.name).toBe("Norte");
    expect(context.team).toBeNull();
  });

  it("returns global context for superuser", () => {
    const context = resolveWorkspaceContext({
      role: "superuser",
      userId: UserId.trust("99"),
      branchId: BranchId.trust("1"),
      branchName: "Lima",
      userTeamId: null,
      assignedTeam: null,
      branchSupervisors: [],
      managedTeam: null,
    });

    expect(context.scopeType).toBe("global");
    expect(context.team).toBeNull();
  });
});
