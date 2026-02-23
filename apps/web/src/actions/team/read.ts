"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { repos } from "~/server/shared/context";

import { provisioning } from "./provisioning";
import type { TeamDirectory, TeamOption } from "./types";

export async function getTeamDirectory(): Promise<TeamDirectory> {
  const session = await requirePermission("team:read");
  const [users, pendingInvites] = await Promise.all([
    repos.users.findByBranch(session.branchId),
    provisioning.listPendingInvites(session.branchId),
  ]);

  return {
    members: users.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      role: u.role,
      teamId: u.team_id,
      isActive: !!u.is_active,
    })),
    pendingInvites,
    canManageInvites:
      session.role === "hr" ||
      session.role === "admin" ||
      session.role === "superuser",
  };
}

export async function getBranchTeamsForInvite(): Promise<TeamOption[]> {
  const session = await requirePermission("hr:manage");
  const teams = await repos.teams.findByBranch(session.branchId);
  return teams.map((team) => ({ id: team.id, name: team.name }));
}
