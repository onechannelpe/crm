import type { SessionData } from "~/lib/auth/access/session";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { CapacityTeam, CapacityUser } from "../application/actor-scope";
import type { ScopeRef } from "./types";

interface ScopeRepos<T extends CapacityUser = CapacityUser> {
  users: {
    findById(id: number): Promise<T | undefined>;
  };
  teams: {
    findBySupervisorId(id: number): Promise<{ id: number } | undefined>;
    findByIdWithSupervisor(id: number): Promise<CapacityTeam | undefined>;
  };
}

function canManageExecutiveRecord(
  actor: SessionData,
  target: CapacityUser,
  supervisedTeamId: number | null,
): boolean {
  if (target.role !== "executive") return false;
  if (actor.role === "superuser") return true;
  if (target.branchId !== actor.branchId) return false;
  if (actor.role === "admin") return true;
  if (actor.role !== "supervisor" || supervisedTeamId == null) return false;
  return target.teamId === supervisedTeamId;
}

export async function canManageExecutive<T extends CapacityUser>(
  actor: SessionData,
  targetUserId: number,
  repos: ScopeRepos<T>,
): Promise<{ ok: boolean; target: T | null }> {
  const target = await repos.users.findById(targetUserId);
  if (!target) return { ok: false, target: null };

  const supervisedTeamId =
    actor.role === "supervisor"
      ? ((await repos.teams.findBySupervisorId(actor.userId))?.id ?? null)
      : null;

  if (!canManageExecutiveRecord(actor, target, supervisedTeamId)) {
    return { ok: false, target };
  }
  return { ok: true, target };
}

export async function canManageScope(
  actor: SessionData,
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

  const team = await repos.teams.findByIdWithSupervisor(scope.scopeId);
  if (!team || team.branchId !== actor.branchId) {
    return Err(domainError("not_found", "team_not_found", "Team not found"));
  }
  if (actor.role === "superuser" || actor.role === "admin") {
    return Ok(undefined);
  }
  if (actor.role !== "supervisor" || team.supervisorId !== actor.userId) {
    return Err(
      domainError(
        "forbidden",
        "forbidden",
        "Cannot manage defaults for this team",
      ),
    );
  }
  return Ok(undefined);
}
