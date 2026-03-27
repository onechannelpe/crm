import { resolveWorkspaceContext } from "~/lib/auth/access/workspace-context";
import { getLoginFlowState } from "~/lib/auth/flows/login-state-service";
import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";
import { deleteSessionCookie } from "~/lib/auth/session/cookies";
import { invalidateSession } from "~/lib/auth/session/session-manager";
import type { AppContext } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import { requiresStrongAuthRole } from "../domain/strong-auth-policy";
import { authRepos } from "../infrastructure/runtime";
import type { CurrentUserView } from "../types";

export async function getLoginFlow(flowId: number) {
  return getLoginFlowState(flowId, authRepos);
}

export async function logoutUser(
  ctx: AppContext,
): Promise<Result<void, DomainError>> {
  const { sessionId, userId } = ctx.actor;

  await invalidateSession(sessionId);
  await authRepos.extensionRuntime.revokeInstallationSessionsByAuthSession(
    sessionId,
    ctx.now(),
  );
  await authRepos.extensionRuntime.updateExecutiveSyncHealthByUser({
    user_id: userId,
    sync_health: "reauth_required",
    sync_updated_at: ctx.now(),
  });
  deleteSessionCookie();
  await authRepos.auditLogs.create({
    user_id: userId,
    action: "logout",
    entity_type: "user",
    entity_id: userId,
    changes: null,
    created_at: ctx.now(),
  });

  return Ok(undefined);
}

export async function getCurrentUser(
  ctx: AppContext,
): Promise<Result<CurrentUserView | null, DomainError>> {
  const { userId, role, sessionClass, primaryAuthMethod, strongAuthMethod } =
    ctx.actor;

  const user = await authRepos.users.findById(userId);
  if (!user) return Ok(null);

  const strongAuthStatus = await getStrongAuthStatus(userId, authRepos);

  const [branch, assignedTeam, managedTeam] = await Promise.all([
    authRepos.branches.findById(user.branch_id),
    user.team_id ? authRepos.teams.findByIdWithSupervisor(user.team_id) : null,
    role === "supervisor"
      ? authRepos.teams.findBySupervisorId(user.id)
      : Promise.resolve(null),
  ]);

  const workspace = resolveWorkspaceContext({
    role,
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

  return Ok({
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
    role,
    strongAuthRequired: requiresStrongAuthRole(user.role),
    strongAuthConfigured: strongAuthStatus.hasVerifiedStrongAuth,
    totpEnabled: strongAuthStatus.hasTotp,
    hasPasskey: strongAuthStatus.hasPasskey,
    passkeyCount: strongAuthStatus.passkeyCount,
    sessionClass,
    primaryAuthMethod,
    strongAuthMethod,
    branchId: user.branch_id,
    scopeType: workspace.scopeType,
    team: workspace.team,
    supervisor: workspace.supervisor,
    branch: workspace.branch,
  });
}
