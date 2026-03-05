"use server";

import { internalError } from "~/lib/app-errors";
import { hasPermission } from "~/lib/auth/access/rbac";
import { getAssignableRoleOptions } from "~/lib/auth/access/role-display";
import { requirePermission } from "~/lib/auth/access/session";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { provisioning } from "./provisioning";
import type { TeamDirectory } from "./types";

export async function getTeamDirectory(): Promise<TeamDirectory> {
  const session = await requirePermission("team:read");
  const canManageInvites = hasPermission(session.role, "hr:manage");
  const users = await repos.users.findByBranch(session.branchId);
  const inviteManagement = canManageInvites
    ? await (async () => {
        const [teams, pendingInvitesResult, branch] = await Promise.all([
          repos.teams.findByBranch(session.branchId),
          provisioning.listPendingInvites(session.branchId),
          repos.branches.findById(session.branchId),
        ]);
        if (!branch) {
          throw internalError("Branch not found");
        }
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
          inviteLink: {
            status: "unavailable" as const,
            url: null,
            reason:
              "Los enlaces públicos están deshabilitados en esta plataforma interna.",
          },
        };
      })()
    : null;

  return {
    members: users.map((u) => ({
      id: u.id,
      fullName: u.full_name,
      email: u.email,
      role: u.role,
      teamId: u.team_id,
      isActive: !!u.is_active,
    })),
    inviteManagement,
  };
}
