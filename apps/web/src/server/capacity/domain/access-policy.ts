import type { AuthSession } from "~/lib/auth/access/session-types";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type {
  CapacityTeam,
  ManageableCapacityUser,
} from "../application/actor-scope";
import type { ScopeRef } from "./types";

interface ScopeRepos<
  T extends ManageableCapacityUser = ManageableCapacityUser,
> {
  users: {
    findById(id: number): Promise<T | undefined>;
  };
  teams: {
    findById(id: number): Promise<CapacityTeam | undefined>;
  };
  branchSupervisors: {
    isSupervisor(branchId: number, userId: number): Promise<boolean>;
  };
}

interface ExecutiveRepos<
  T extends ManageableCapacityUser = ManageableCapacityUser,
> {
  users: {
    findById(id: number): Promise<T | undefined>;
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
  targetUserId: number,
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
      return Err(
        domainError(
          "forbidden",
          "forbidden",
          "Insufficient role to manage branch default",
        ),
      );
    }
    if (actor.branchId !== scope.scopeId) {
      return Err(
        domainError(
          "forbidden",
          "forbidden",
          "Cannot manage defaults for another branch",
        ),
      );
    }
    return Ok(undefined);
  }

  const team = await repos.teams.findById(scope.scopeId);
  if (!team || team.branchId !== actor.branchId) {
    return Err(domainError("not_found", "team_not_found", "Team not found"));
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

  return Err(
    domainError(
      "forbidden",
      "forbidden",
      "Cannot manage defaults for this team",
    ),
  );
}
