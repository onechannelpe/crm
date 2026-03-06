"use server";

import { internalError } from "~/lib/app-errors";
import { getAssignableRoleOptions } from "~/lib/auth/access/role-display";
import { requirePermission } from "~/lib/auth/access/session";
import { extensionService } from "~/server/shared/context";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { provisioning } from "./provisioning";
import type { BulkImportSetup, InviteManagement, TeamMember } from "./types";

export async function getTeamMembers(): Promise<TeamMember[]> {
  const session = await requirePermission("team:read");
  const [users, extensionStatusesResult] = await Promise.all([
    repos.users.findByBranch(session.branchId),
    extensionService.listTeamExecutiveStatuses({
      role: session.role,
      userId: session.userId,
      branchId: session.branchId,
    }),
  ]);
  if (isErr(extensionStatusesResult)) {
    throw internalError(extensionStatusesResult.error.message);
  }

  const extensionStatuses = new Map(
    extensionStatusesResult.value.map((status) => [status.userId, status]),
  );
  return users.map((u) => ({
    id: u.id,
    names: u.names,
    firstSurname: u.first_surname,
    secondSurname: u.second_surname,
    email: u.email,
    role: u.role,
    teamId: u.team_id,
    isActive: !!u.is_active,
    expiresAt: u.expires_at,
    extensionPresenceStatus:
      extensionStatuses.get(u.id)?.presenceStatus ?? null,
    extensionSyncHealth: extensionStatuses.get(u.id)?.syncHealth ?? null,
    extensionPresenceUpdatedAt:
      extensionStatuses.get(u.id)?.presenceUpdatedAt ?? null,
    extensionSyncUpdatedAt: extensionStatuses.get(u.id)?.syncUpdatedAt ?? null,
  }));
}

export async function getInviteManagement(): Promise<InviteManagement> {
  const session = await requirePermission("hr:manage");
  const [teams, pendingInvitesResult] = await Promise.all([
    repos.teams.findByBranch(session.branchId),
    provisioning.listPendingInvites(session.branchId),
  ]);
  if (isErr(pendingInvitesResult)) {
    switch (pendingInvitesResult.error.reason) {
      case "unexpected":
        throw internalError(pendingInvitesResult.error.message);
      default: {
        const exhausted: never = pendingInvitesResult.error.reason;
        throw internalError(
          `Unhandled pending invites read error: ${String(exhausted)}`,
        );
      }
    }
  }
  return {
    pendingInvites: pendingInvitesResult.value,
    teams: teams.map((team) => ({ id: team.id, name: team.name })),
    assignableRoles: getAssignableRoleOptions(session.role),
  };
}

export async function getBulkImportSetup(): Promise<BulkImportSetup> {
  const session = await requirePermission("admin:manage");
  return { assignableRoles: getAssignableRoleOptions(session.role) };
}
