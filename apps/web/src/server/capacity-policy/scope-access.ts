import type { SessionData } from "~/lib/auth/access/session";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { BranchId, TeamId, UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

type UserRow = {
  role: string;
  branch_id: number;
  team_id: number | null;
};

type TeamRow = {
  id: number;
  branch_id: number;
  supervisor_id: number | null;
};

interface ScopeRepos<T extends UserRow = UserRow> {
  users: {
    findById(id: UserId): Promise<T | undefined>;
  };
  teams: {
    findBySupervisorId(
      supervisorId: UserId,
    ): Promise<{ id: number } | undefined>;
    findByIdWithSupervisor(id: TeamId): Promise<TeamRow | undefined>;
  };
}

function canManageExecutiveRecord(
  actor: SessionData,
  target: UserRow,
  supervisedTeamId: number | null,
): boolean {
  if (target.role !== "executive") return false;
  if (actor.role === "superuser") return true;
  if (target.branch_id !== actor.branchId) return false;
  if (actor.role === "admin") return true;
  if (actor.role !== "supervisor" || supervisedTeamId == null) return false;
  return target.team_id === supervisedTeamId;
}

export async function canManageExecutive<T extends UserRow>(
  actor: SessionData,
  targetUserId: UserId,
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

export async function canManageScopeDefault(
  actor: SessionData,
  scope:
    | { scopeType: "branch"; scopeId: BranchId }
    | { scopeType: "team"; scopeId: TeamId },
  repos: ScopeRepos,
): Promise<Result<void, DomainError>> {
  if (scope.scopeType === "branch") {
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
  if (!team || team.branch_id !== actor.branchId) {
    return Err(domainError("not_found", "team_not_found", "Team not found"));
  }
  if (actor.role === "superuser" || actor.role === "admin") {
    return Ok(undefined);
  }
  if (actor.role !== "supervisor" || team.supervisor_id !== actor.userId) {
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
