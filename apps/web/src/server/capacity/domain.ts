import type { Role } from "~/lib/auth/access/rbac";
import type { SessionData } from "~/lib/auth/access/session";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { CapacityRequestKind, ScopeRef } from "./types";

type ManagedUser = {
  role: Role;
  branch_id: number;
  team_id: number | null;
};

type ManagedTeam = {
  id: number;
  branch_id: number;
  supervisor_id: number | null;
};

interface ScopeRepos<T extends ManagedUser = ManagedUser> {
  users: {
    findById(id: number): Promise<T | undefined>;
  };
  teams: {
    findBySupervisorId(id: number): Promise<{ id: number } | undefined>;
    findByIdWithSupervisor(id: number): Promise<ManagedTeam | undefined>;
  };
}

export function normalizeDecisionNote(
  note: string | null | undefined,
): string | null {
  const trimmed = note?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function toDbCapacityRequestKind(
  kind: CapacityRequestKind,
): "search_extra" | "lead_refill_extra" {
  return kind === "search_extra" ? "search_extra" : "lead_refill_extra";
}

export function fromDbCapacityRequestKind(
  kind: "search_extra" | "lead_refill_extra",
): CapacityRequestKind {
  return kind === "search_extra" ? "search_extra" : "lead_refill";
}

function canManageExecutiveRecord(
  actor: SessionData,
  target: ManagedUser,
  supervisedTeamId: number | null,
): boolean {
  if (target.role !== "executive") return false;
  if (actor.role === "superuser") return true;
  if (target.branch_id !== actor.branchId) return false;
  if (actor.role === "admin") return true;
  if (actor.role !== "supervisor" || supervisedTeamId == null) return false;
  return target.team_id === supervisedTeamId;
}

export async function canManageExecutive<T extends ManagedUser>(
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
