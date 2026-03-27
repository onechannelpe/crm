import { resolveWorkspaceContext } from "~/lib/auth/access/workspace-context";
import {
  getStrongAuthStatus,
  requiresStrongAuthRole,
} from "~/lib/auth/security/strong-auth-status";
import { deleteSessionCookie } from "~/lib/auth/session/cookies";
import { invalidateSession } from "~/lib/auth/session/session-manager";
import { repos } from "~/server/shared/context";

import type { CurrentUserView } from "./types";

export async function logoutUser(
  session: {
    id: string;
    userId: number;
  } | null,
): Promise<void> {
  if (!session) {
    deleteSessionCookie();
    return;
  }

  await invalidateSession(session.id);
  await repos.extensionRuntime.revokeInstallationSessionsByAuthSession(
    session.id,
    Date.now(),
  );
  await repos.extensionRuntime.updateExecutiveSyncHealthByUser({
    user_id: session.userId,
    sync_health: "reauth_required",
    sync_updated_at: Date.now(),
  });
  deleteSessionCookie();
  await repos.auditLogs.create({
    user_id: session.userId,
    action: "logout",
    entity_type: "user",
    entity_id: session.userId,
    changes: null,
    created_at: Date.now(),
  });
}

export async function getCurrentUser(
  session: {
    userId: number;
    role: CurrentUserView["role"];
    sessionClass: CurrentUserView["sessionClass"];
    primaryAuthMethod: CurrentUserView["primaryAuthMethod"];
    strongAuthMethod: CurrentUserView["strongAuthMethod"];
  } | null,
): Promise<CurrentUserView | null> {
  if (!session) return null;

  const user = await repos.users.findById(session.userId);
  if (!user) return null;
  const strongAuthStatus = await getStrongAuthStatus(session.userId, repos);

  const [branch, assignedTeam, managedTeam] = await Promise.all([
    repos.branches.findById(user.branch_id),
    user.team_id ? repos.teams.findByIdWithSupervisor(user.team_id) : null,
    session.role === "supervisor"
      ? repos.teams.findBySupervisorId(user.id)
      : Promise.resolve(null),
  ]);
  const workspace = resolveWorkspaceContext({
    role: session.role,
    userId: user.id,
    branchId: user.branch_id,
    branchName: branch?.name ?? null,
    userTeamId: user.team_id,
    assignedTeam: assignedTeam
      ? {
          id: assignedTeam.id,
          name: assignedTeam.name,
          branch_id: assignedTeam.branch_id,
          supervisor_id: assignedTeam.supervisor_id,
          supervisor_names: assignedTeam.supervisor_names,
          supervisor_first_surname: assignedTeam.supervisor_first_surname,
          supervisor_role: assignedTeam.supervisor_role,
          supervisor_branch_id: assignedTeam.supervisor_branch_id,
        }
      : null,
    managedTeam: managedTeam
      ? {
          id: managedTeam.id,
          name: managedTeam.name,
          branch_id: managedTeam.branch_id,
        }
      : null,
  });

  return {
    id: user.id,
    email: user.email,
    names: user.names,
    firstSurname: user.first_surname,
    secondSurname: user.second_surname,
    phoneE164: user.phone_e164,
    avatarUrl: user.avatar_storage_key
      ? `/api/me/avatar?v=${user.avatar_version}`
      : null,
    avatarVersion: user.avatar_version,
    onboardingCompletedAt: user.onboarding_completed_at,
    role: session.role,
    strongAuthRequired: requiresStrongAuthRole(user.role),
    strongAuthConfigured: strongAuthStatus.hasVerifiedStrongAuth,
    totpEnabled: strongAuthStatus.hasTotp,
    hasPasskey: strongAuthStatus.hasPasskey,
    passkeyCount: strongAuthStatus.passkeyCount,
    sessionClass: session.sessionClass,
    primaryAuthMethod: session.primaryAuthMethod,
    strongAuthMethod: session.strongAuthMethod,
    branchId: user.branch_id,
    scopeType: workspace.scopeType,
    team: workspace.team,
    supervisor: workspace.supervisor,
    branch: workspace.branch,
  };
}
