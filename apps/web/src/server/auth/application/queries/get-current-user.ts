import { resolveWorkspaceContext } from "~/lib/auth/access/workspace-context";
import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";
import type { AppContext } from "~/server/platform/action/context";
import type { DomainError } from "~/server/shared/domain-error";
import { Ok, type Result } from "~/server/shared/result";

import type { AuthSessionReadContext } from "../../infrastructure/session-context";
import type { CurrentUserView } from "../contracts";

export async function getCurrentUser(
  ctx: AppContext,
  deps: AuthSessionReadContext,
): Promise<Result<CurrentUserView | null, DomainError>> {
  const { userId, role, sessionClass, primaryAuthMethod, strongAuthMethod } =
    ctx.actor;

  const user = await deps.repos.users.findById(userId);
  if (!user) return Ok(null);

  const [strongAuthStatus, whatsappAddr] = await Promise.all([
    getStrongAuthStatus(userId, deps.repos),
    deps.repos.userChannelAddresses.findByUserAndChannel(user.id, "whatsapp"),
  ]);

  const [branch, assignedTeam, branchSupervisors] = await Promise.all([
    deps.repos.branches.findById(user.branch_id),
    user.team_id ? deps.repos.teams.findById(user.team_id) : null,
    deps.repos.branchSupervisors.findByBranch(user.branch_id),
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
        }
      : null,
    managedTeam: null,
    branchSupervisors,
  });

  return Ok({
    id: user.id,
    email: user.email,
    names: user.names,
    firstSurname: user.first_surname,
    secondSurname: user.second_surname,
    phone: whatsappAddr?.address ?? null,
    avatarUrl: user.avatar_storage_key
      ? `/api/me/avatar?v=${user.avatar_version}`
      : null,
    avatarVersion: user.avatar_version,
    onboardingCompletedAt: user.onboarding_completed_at?.getTime() ?? null,
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
    impersonating: ctx.actor.impersonatorUserId !== null,
  });
}
