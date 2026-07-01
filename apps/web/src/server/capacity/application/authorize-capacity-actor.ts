import type { AuthSession } from "~/lib/auth/access/session-types";
import {
  fail,
  forbidden,
  type DomainError,
} from "~/server/shared/domain-error";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { ScopeRef } from "../domain/types";
import type { CapacityTeam, ManageableCapacityUser } from "./actor-scope";

interface ScopeRepos<
  T extends ManageableCapacityUser = ManageableCapacityUser,
> {
  users: {
    findById(id: UserId): Promise<T | undefined>;
  };
  teams: {
    findById(id: TeamId): Promise<CapacityTeam | undefined>;
  };
  branchSupervisors: {
    isSupervisor(branchId: BranchId, userId: UserId): Promise<boolean>;
  };
}

interface ExecutiveRepos<
  T extends ManageableCapacityUser = ManageableCapacityUser,
> {
  users: {
    findById(id: UserId): Promise<T | undefined>;
  };
}

function canManageExecutiveRecord(
  actor: AuthSession,
  target: ManageableCapacityUser,
): boolean {
  if (target.role !== "executive") return false;
  if (actor.role === "superuser") return true;
  if (target.branchId !== actor.branchId) return false;
  if (actor.role === "admin") return true;
  if (actor.role === "supervisor") return true;
  return false;
}

export async function canManageExecutive<T extends ManageableCapacityUser>(
  actor: AuthSession,
  targetUserId: UserId,
  repos: ExecutiveRepos<T>,
): Promise<{ ok: boolean; target: T | null }> {
  const target = await repos.users.findById(targetUserId);
  if (!target) return { ok: false, target: null };

  if (!canManageExecutiveRecord(actor, target)) {
    return { ok: false, target };
  }
  return { ok: true, target };
}

export async function canManageScope(
  actor: AuthSession,
  scope: ScopeRef,
  repos: ScopeRepos,
): Promise<Result<void, DomainError>> {
  if (scope.kind === "branch") {
    if (actor.role !== "superuser" && actor.role !== "admin") {
      return Err(forbidden());
    }
    if (actor.branchId !== scope.scopeId) {
      return Err(forbidden());
    }
    return Ok(undefined);
  }

  const team = await repos.teams.findById(scope.scopeId);
  if (!team || team.branchId !== actor.branchId) {
    return Err(fail("team_not_found"));
  }
  if (actor.role === "superuser" || actor.role === "admin") {
    return Ok(undefined);
  }

  if (actor.role === "supervisor") {
    const isSupervisor = await repos.branchSupervisors.isSupervisor(
      team.branchId,
      actor.userId,
    );
    if (isSupervisor) {
      return Ok(undefined);
    }
  }

  return Err(forbidden());
}
