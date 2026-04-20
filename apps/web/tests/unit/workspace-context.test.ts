import { describe, expect, it } from "vitest";

import { resolveWorkspaceContext } from "../../src/lib/auth/access/workspace-context";
import { asBranchId, asTeamId, asUserId } from "../../src/server/shared/ids";

describe("workspace context resolver", () => {
  it("builds executive context from team and supervisor", () => {
    const context = resolveWorkspaceContext({
      role: "executive",
      userId: asUserId("user-10"),
      branchId: asBranchId("branch-1"),
      branchName: "Lima",
      userTeamId: asTeamId("team-3"),
      assignedTeam: {
        id: asTeamId("team-3"),
        name: "Alpha",
        branch_id: asBranchId("branch-1"),
        supervisor_id: asUserId("user-4"),
        supervisor_names: "Diego",
        supervisor_first_surname: "Ramirez",
        supervisor_role: "supervisor",
        supervisor_branch_id: asBranchId("branch-1"),
      },
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
        userId: asUserId("user-10"),
        branchId: asBranchId("branch-1"),
        branchName: "Lima",
        userTeamId: null,
        assignedTeam: null,
        managedTeam: null,
      }),
    ).toThrow(/misconfigured/i);
  });

  it("returns managed team context for supervisor", () => {
    const context = resolveWorkspaceContext({
      role: "supervisor",
      userId: asUserId("user-4"),
      branchId: asBranchId("branch-1"),
      branchName: "Lima",
      userTeamId: null,
      assignedTeam: null,
      managedTeam: {
        id: asTeamId("team-3"),
        name: "Alpha",
        branch_id: asBranchId("branch-1"),
      },
    });

    expect(context.scopeType).toBe("team");
    expect(context.team?.id).toBe(3);
    expect(context.supervisor).toBeNull();
  });

  it("returns branch context for admin roles", () => {
    const context = resolveWorkspaceContext({
      role: "admin",
      userId: asUserId("user-1"),
      branchId: asBranchId("branch-2"),
      branchName: "Norte",
      userTeamId: null,
      assignedTeam: null,
      managedTeam: null,
    });

    expect(context.scopeType).toBe("branch");
    expect(context.branch?.name).toBe("Norte");
    expect(context.team).toBeNull();
  });

  it("returns global context for superuser", () => {
    const context = resolveWorkspaceContext({
      role: "superuser",
      userId: asUserId("user-99"),
      branchId: asBranchId("branch-1"),
      branchName: "Lima",
      userTeamId: null,
      assignedTeam: null,
      managedTeam: null,
    });

    expect(context.scopeType).toBe("global");
    expect(context.team).toBeNull();
  });
});
