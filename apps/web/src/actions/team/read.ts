"use server";

import { internalError } from "~/lib/app-errors";
import { getAssignableRoleOptions } from "~/lib/auth/access/role-display";
import { requirePermission } from "~/lib/auth/access/session";
import { repos } from "~/server/shared/context";
import { isErr } from "~/server/shared/result";

import { provisioning } from "./provisioning";
import type { BulkImportSetup, InviteManagement } from "./types";

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
