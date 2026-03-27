import * as fc from "fast-check";
import { describe, expect, it } from "vitest";

import type { Role } from "~/lib/auth/access/rbac";
import { canManageExecutive } from "~/server/capacity-policy/scope-access";

type TargetUser = { role: Role; branch_id: number; team_id: number | null };

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
    sessionId: "test",
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
  target: { role: Role; branch_id: number; team_id: number | null } | undefined,
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
  it("returns ok false for all non-manager roles regardless of target", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.constantFrom(...NON_MANAGER_ROLES),
        fc.nat({ max: 10 }).map((n) => n + 1),
        async (role, branchId) => {
          const actor = makeActor(role, branchId);
          const target: TargetUser = {
            role: "executive",
            branch_id: branchId,
            team_id: null,
          };
          const repos = makeRepos(target);
          const result = await canManageExecutive(actor, 1, repos);
          return !result.ok;
        },
      ),
      { numRuns: 50 },
    );
  });

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
      branch_id: 1,
      team_id: null,
    };
    const repos = makeRepos(target);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result.ok).toBe(false);
  });

  it("superuser can manage any executive in any branch", async () => {
    const actor = makeActor("superuser", 1);
    const target: TargetUser = {
      role: "executive",
      branch_id: 2,
      team_id: null,
    };
    const repos = makeRepos(target);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result.ok).toBe(true);
  });

  it("admin can manage executive in same branch", async () => {
    const actor = makeActor("admin", 1);
    const target: TargetUser = {
      role: "executive",
      branch_id: 1,
      team_id: null,
    };
    const repos = makeRepos(target);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result.ok).toBe(true);
  });

  it("admin cannot manage executive in different branch", async () => {
    const actor = makeActor("admin", 1);
    const target: TargetUser = {
      role: "executive",
      branch_id: 2,
      team_id: null,
    };
    const repos = makeRepos(target);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result.ok).toBe(false);
  });

  it("supervisor can manage executive on their team in same branch", async () => {
    const actor = makeActor("supervisor", 1);
    const target: TargetUser = { role: "executive", branch_id: 1, team_id: 5 };
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

  it("supervisor cannot manage executive on a different team", async () => {
    const actor = makeActor("supervisor", 1);
    const target: TargetUser = { role: "executive", branch_id: 1, team_id: 7 };
    const repos = {
      users: { findById: async () => target },
      teams: {
        findBySupervisorId: async () => ({ id: 5 }),
        findByIdWithSupervisor: async () => undefined,
      },
    };
    const result = await canManageExecutive(actor, 1, repos);
    expect(result.ok).toBe(false);
  });
});
