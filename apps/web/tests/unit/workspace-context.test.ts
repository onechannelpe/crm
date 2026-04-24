import { describe, expect, it } from "vitest";

import { resolveWorkspaceContext } from "../../src/lib/auth/access/workspace-context";

describe("workspace context resolver", () => {
  it("builds executive context from team and supervisor", () => {
    const context = resolveWorkspaceContext({
      role: "executive",
      userId: 10,
      branchId: 1,
      branchName: "Lima",
      userTeamId: 3,
      assignedTeam: {
        id: 3,
        name: "Alpha",
        branch_id: 1,
        supervisor_id: 4,
        supervisor_names: "Diego",
        supervisor_first_surname: "Ramirez",
        supervisor_role: "supervisor",
        supervisor_branch_id: 1,
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
        userId: 10,
        branchId: 1,
        branchName: "Lima",
        userTeamId: null,
        assignedTeam: null,
        managedTeam: null,
      }),
    ).toThrow(/misconfigured/i);
  });

  it("returns branch context for supervisor", () => {
    const context = resolveWorkspaceContext({
      role: "supervisor",
      userId: 4,
      branchId: 1,
      branchName: "Lima",
      userTeamId: null,
      assignedTeam: null,
      managedTeam: null,
    });

    expect(context.scopeType).toBe("branch");
    expect(context.branch?.name).toBe("Lima");
    expect(context.supervisor).toBeNull();
  });

  it("returns branch context for admin roles", () => {
    const context = resolveWorkspaceContext({
      role: "admin",
      userId: 1,
      branchId: 2,
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
      userId: 99,
      branchId: 1,
      branchName: "Lima",
      userTeamId: null,
      assignedTeam: null,
      managedTeam: null,
    });

    expect(context.scopeType).toBe("global");
    expect(context.team).toBeNull();
  });
});
