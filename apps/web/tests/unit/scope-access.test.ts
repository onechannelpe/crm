import { describe, expect, it } from "vitest";

import type { Role } from "~/lib/auth/access/rbac";
import { canManageExecutive } from "~/server/capacity/domain/access-policy";

type TargetUser = { role: Role; branchId: number; teamId: number | null };

// Roles that must never be able to manage an executive
const NON_MANAGER_ROLES = [
  "executive",
  "back_office",
  "sales_manager",
  "logistics",
  "hr",
] as const;

function makeActor(role: Role = "admin", branchId = 1) {
  return {
    id: "test",
    userId: 99,
    role,
    branchId,
    onboardingCompleted: true,
    sessionClass: "app" as const,
    primaryAuthMethod: "password" as const,
    strongAuthMethod: null,
    strongAuthAt: null,
  };
}

function makeRepos(
  target: { role: Role; branchId: number; teamId: number | null } | undefined,
) {
  return {
    users: {
      findById: async () => target,
    },
    teams: {
      findBySupervisorId: async () => undefined,
      findByIdWithSupervisor: async () => undefined,
    },
  };
}

describe("canManageExecutive", () => {
  it.each(NON_MANAGER_ROLES)(
    "returns ok false for role %s regardless of branch",
    async (role) => {
      const actor = makeActor(role, 1);
      const target: TargetUser = {
        role: "executive",
        branchId: 1,
        teamId: null,
      };
      const repos = makeRepos(target);
      const result = await canManageExecutive(actor, 1, repos);
      expect(result.ok).toBe(false);

      // Also check different branch
      const actorDiff = makeActor(role, 2);
      const resultDiff = await canManageExecutive(actorDiff, 1, repos);
      expect(resultDiff.ok).toBe(false);
    },
  );

  it("returns ok false when target user does not exist", async () => {
    const actor = makeActor("superuser");
    const repos = makeRepos(undefined);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result.ok).toBe(false);
    expect(result.target).toBeNull();
  });

  it("returns ok false when target is not an executive", async () => {
    const actor = makeActor("admin");
    const target: TargetUser = {
      role: "back_office",
      branchId: 1,
      teamId: null,
    };
    const repos = makeRepos(target);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result.ok).toBe(false);
  });

  it("superuser can manage any executive in any branch", async () => {
    const actor = makeActor("superuser", 1);
    const target: TargetUser = {
      role: "executive",
      branchId: 2,
      teamId: null,
    };
    const repos = makeRepos(target);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result.ok).toBe(true);
  });

  it("admin can manage executive in same branch", async () => {
    const actor = makeActor("admin", 1);
    const target: TargetUser = {
      role: "executive",
      branchId: 1,
      teamId: null,
    };
    const repos = makeRepos(target);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result.ok).toBe(true);
  });

  it("admin cannot manage executive in different branch", async () => {
    const actor = makeActor("admin", 1);
    const target: TargetUser = {
      role: "executive",
      branchId: 2,
      teamId: null,
    };
    const repos = makeRepos(target);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result.ok).toBe(false);
  });

  it("supervisor can manage executive on their team in same branch", async () => {
    const actor = makeActor("supervisor", 1);
    const target: TargetUser = { role: "executive", branchId: 1, teamId: 5 };
    const repos = {
      users: { findById: async () => target },
      teams: {
        findBySupervisorId: async () => ({ id: 5 }),
        findByIdWithSupervisor: async () => undefined,
      },
    };
    const result = await canManageExecutive(actor, 1, repos);
    expect(result.ok).toBe(true);
  });

  it("supervisor cannot manage executive on a different team in same branch", async () => {
    const actor = makeActor("supervisor", 1);
    const target: TargetUser = { role: "executive", branchId: 1, teamId: 7 };
    const repos = {
      users: { findById: async () => target },
      teams: {
        findBySupervisorId: async () => ({ id: 5 }), // Actor is supervisor of Team 5
        findByIdWithSupervisor: async () => undefined,
      },
    };
    const result = await canManageExecutive(actor, 1, repos);
    expect(result.ok).toBe(false);
  });

  it("supervisor cannot manage executive on their team but in a different branch", async () => {
    const actor = makeActor("supervisor", 1);
    const target: TargetUser = { role: "executive", branchId: 2, teamId: 5 };
    const repos = {
      users: { findById: async () => target },
      teams: {
        findBySupervisorId: async () => ({ id: 5 }),
        findByIdWithSupervisor: async () => undefined,
      },
    };
    const result = await canManageExecutive(actor, 1, repos);
    // Even if it's "their team id", branch boundaries usually take precedence or
    // are checked as primary scope.
    expect(result.ok).toBe(false);
  });
});
