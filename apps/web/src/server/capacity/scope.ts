import type { SessionData } from "~/lib/auth/access/session";
import type { Repositories } from "~/server/shared/registry";

export async function canManageExecutive(
  actor: SessionData,
  targetUserId: number,
  repos: Repositories,
) {
  const target = await repos.users.findById(targetUserId);
  if (!target || target.role !== "executive") {
    return { ok: false as const, target: null };
  }
  if (actor.role === "superuser") {
    return { ok: true as const, target };
  }
  if (target.branch_id !== actor.branchId) {
    return { ok: false as const, target };
  }
  if (actor.role === "admin") {
    return { ok: true as const, target };
  }
  if (actor.role !== "supervisor") {
    return { ok: false as const, target };
  }
  const supervisedTeam = await repos.teams.findBySupervisorId(actor.userId);
  if (!supervisedTeam || target.team_id !== supervisedTeam.id) {
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
