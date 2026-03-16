import type { SessionData } from "~/lib/auth/access/session";
import type { Repositories } from "~/server/shared/registry";

type ExecutiveUser = NonNullable<
  Awaited<ReturnType<Repositories["users"]["findById"]>>
>;

export function canManageExecutiveRecord(
  actor: SessionData,
  target: ExecutiveUser,
  supervisedTeamId: number | null,
) {
  if (target.role !== "executive") {
    return false;
  }

  if (actor.role === "superuser") {
    return true;
  }

  if (target.branch_id !== actor.branchId) {
    return false;
  }

  if (actor.role === "admin") {
    return true;
  }

  if (actor.role !== "supervisor" || supervisedTeamId == null) {
    return false;
  }

  return target.team_id === supervisedTeamId;
}

export async function canManageExecutive(
  actor: SessionData,
  targetUserId: number,
  repos: Repositories,
) {
  const target = await repos.users.findById(targetUserId);
  if (!target) {
    return { ok: false as const, target: null };
  }

  const supervisedTeamId =
    actor.role === "supervisor"
      ? (await repos.teams.findBySupervisorId(actor.userId))?.id ?? null
      : null;

  if (!canManageExecutiveRecord(actor, target, supervisedTeamId)) {
    return { ok: false as const, target };
  }

  return { ok: true as const, target };
}

export async function assertCanManageTeam(
  actor: SessionData,
  teamId: number,
  repos: Repositories,
) {
  const team = await repos.teams.findByIdWithSupervisor(teamId);
  if (!team || team.branch_id !== actor.branchId) {
    return { ok: false as const, team: null };
  }
  if (actor.role === "superuser" || actor.role === "admin") {
    return { ok: true as const, team };
  }
  if (actor.role !== "supervisor") {
    return { ok: false as const, team };
  }
  if (team.supervisor_id !== actor.userId) {
    return { ok: false as const, team };
  }
  return { ok: true as const, team };
}
