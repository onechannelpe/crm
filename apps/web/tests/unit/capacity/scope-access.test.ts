import { makeActor } from "@tests/support/unit/factories";
import {
  makeMockRepos,
  makeUserMockRepos,
} from "@tests/support/unit/scope-access-fakes";
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

describe("canManageExecutive", () => {
  it.each(NON_MANAGER_ROLES)(
    "returns ok false for role %s regardless of branch",
    async (role) => {
      const actor = makeActor({ role, branchId: 1 });
      const target: TargetUser = {
        role: "executive",
        branchId: 1,
        teamId: null,
      };
      const repos = makeUserMockRepos(target);
      const result = await canManageExecutive(actor, 1, repos);
      expect(result).toMatchObject({ ok: false });

      // Also check different branch
      const actorDiff = makeActor({ role, branchId: 2 });
      const resultDiff = await canManageExecutive(actorDiff, 1, repos);
      expect(resultDiff).toMatchObject({ ok: false });
    },
  );

  it("returns ok false when target user does not exist", async () => {
    const actor = makeActor({ role: "superuser" });
    const repos = makeUserMockRepos(undefined);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result).toMatchObject({ ok: false });
    expect(result.target).toBeNull();
  });

  it("returns ok false when target is not an executive", async () => {
    const actor = makeActor({ role: "admin" });
    const target: TargetUser = {
      role: "back_office",
      branchId: 1,
      teamId: null,
    };
    const repos = makeUserMockRepos(target);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result).toMatchObject({ ok: false });
  });

  it("superuser can manage any executive in any branch", async () => {
    const actor = makeActor({ role: "superuser", branchId: 1 });
    const target: TargetUser = {
      role: "executive",
      branchId: 2,
      teamId: null,
    };
    const repos = makeUserMockRepos(target);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result).toMatchObject({ ok: true });
  });

  it("admin can manage executive in same branch", async () => {
    const actor = makeActor({ role: "admin", branchId: 1 });
    const target: TargetUser = {
      role: "executive",
      branchId: 1,
      teamId: null,
    };
    const repos = makeUserMockRepos(target);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result).toMatchObject({ ok: true });
  });

  it("admin cannot manage executive in different branch", async () => {
    const actor = makeActor({ role: "admin", branchId: 1 });
    const target: TargetUser = {
      role: "executive",
      branchId: 2,
      teamId: null,
    };
    const repos = makeUserMockRepos(target);
    const result = await canManageExecutive(actor, 1, repos);
    expect(result).toMatchObject({ ok: false });
  });

  it("supervisor can manage executive in same branch regardless of team", async () => {
    const actor = makeActor({ role: "supervisor", branchId: 1, userId: 100 });
    const target: TargetUser = { role: "executive", branchId: 1, teamId: 5 };
    const repos = makeMockRepos({
      users: { findById: async () => target },
      branchSupervisors: {
        findByBranch: async () => [{ user_id: 100 }],
      },
    });
    const result = await canManageExecutive(actor, 1, repos);
    expect(result).toMatchObject({ ok: true });

    const targetOtherTeam: TargetUser = {
      role: "executive",
      branchId: 1,
      teamId: 7,
    };
    const reposOther = makeMockRepos({
      users: { findById: async () => targetOtherTeam },
      branchSupervisors: {
        findByBranch: async () => [{ user_id: 100 }],
      },
    });
    const resultOther = await canManageExecutive(actor, 1, reposOther);
    expect(resultOther).toMatchObject({ ok: true });
  });

  it("supervisor cannot manage executive on their team but in a different branch", async () => {
    const actor = makeActor({ role: "supervisor", branchId: 1 });
    const target: TargetUser = { role: "executive", branchId: 2, teamId: 5 };
    const repos = makeMockRepos({
      users: { findById: async () => target },
    });
    const result = await canManageExecutive(actor, 1, repos);
    // Even if it's "their team id", branch boundaries usually take precedence or
    // are checked as primary scope.
    expect(result).toMatchObject({ ok: false });
  });
});
