import { describe, expect, it } from "vitest";

import { resolveWorkspaceContext } from "~/lib/auth/access/workspace-context";
import { asBranchId, asTeamId, asUserId } from "~/server/shared/ids";

describe("workspace context resolver", () => {
  it("builds executive context from team and supervisor", () => {
    const context = resolveWorkspaceContext({
      role: "executive",
      userId: asUserId("10"),
      branchId: asBranchId("1"),
      branchName: "Lima",
      userTeamId: asTeamId("3"),
      assignedTeam: {
        id: asTeamId("3"),
        name: "Alpha",
        branch_id: asBranchId("1"),
      },
      branchSupervisors: [
        { id: "sup-1", user_id: asUserId("4"), names: "Diego" },
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
        userId: asUserId("10"),
        branchId: asBranchId("1"),
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
      userId: asUserId("4"),
      branchId: asBranchId("1"),
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
      userId: asUserId("1"),
      branchId: asBranchId("2"),
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
      userId: asUserId("99"),
      branchId: asBranchId("1"),
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
