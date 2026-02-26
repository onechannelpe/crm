"use server";

import { internalError } from "~/lib/app-errors";
import { requirePermission } from "~/lib/auth/access/session";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { provisioning } from "./provisioning";
import type { TeamDirectory, TeamOption } from "./types";

export async function getTeamDirectory(): Promise<TeamDirectory> {
  const session = await requirePermission("team:read");
  const [users, pendingInvitesResult] = await Promise.all([
    repos.users.findByBranch(session.branchId),
    provisioning.listPendingInvites(session.branchId),
  ]);
  if (isErr(pendingInvitesResult)) {
    switch (pendingInvitesResult.error.reason) {
      case "unexpected":
        throw internalError(pendingInvitesResult.error.message);
      default: {
        const exhausted: never = pendingInvitesResult.error;
        throw internalError(
          `Unhandled pending invites read error: ${String(exhausted)}`,
        );
      }
    }
  }

  return {
    members: users.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      role: u.role,
      teamId: u.team_id,
      isActive: !!u.is_active,
    })),
    pendingInvites: pendingInvitesResult.value,
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
