import type { MemberDetail } from "~/contracts/members";
import {
  canDeleteMember,
  canImpersonateMember,
  canManageMember,
} from "~/lib/auth/access/member-management";
import { getPermissions } from "~/lib/auth/access/rbac";
import { getAssignableRoleOptions } from "~/lib/auth/access/role-display";
import { appCalendarDateBefore } from "~/lib/time/app-time";
import type { AppContext } from "~/server/platform/action/context";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import { memberAvatarUrl } from "../member-view";
import type { MemberReadDeps } from "../ports";

export async function getMemberDetail(
  ctx: AppContext,
  deps: MemberReadDeps,
  input: { userId: UserId },
): Promise<Result<MemberDetail, DomainError>> {
  const user = await deps.users.findById(input.userId);
  if (!user || user.branch_id !== ctx.actor.branchId) {
    return Err(fail("user_not_found"));
  }

  const [team, branch, branchTeams] = await Promise.all([
    user.team_id ? deps.teams.findById(user.team_id) : Promise.resolve(null),
    deps.branches.findById(user.branch_id),
    deps.teams.findByBranch(user.branch_id),
  ]);

  const actorRole = ctx.actor.role;
  const isSelf = user.id === ctx.actor.userId;

  return Ok({
    id: user.id,
    names: user.names,
    firstSurname: user.first_surname,
    secondSurname: user.second_surname,
    email: user.email,
    role: user.role,
    executiveCategory: user.executive_category,
    teamId: user.team_id,
    teamName: team?.name ?? null,
    branchName: branch?.name ?? null,
    isActive: user.is_active,
    onboardingCompleted: user.onboarding_completed_at !== null,
    avatarUrl: memberAvatarUrl(
      user.id,
      user.avatar_storage_key !== null,
      user.avatar_version,
    ),
    expiresOn: user.expires_at ? appCalendarDateBefore(user.expires_at) : null,
    permissions: getPermissions(user.role),
    assignableRoles: getAssignableRoleOptions(actorRole),
    teams: branchTeams.map((branchTeam) => ({
      id: branchTeam.id,
      name: branchTeam.name,
    })),
    canManage: !isSelf && canManageMember(actorRole, user.role),
    canDelete: !isSelf && canDeleteMember(actorRole, user.role),
    canImpersonate: !isSelf && canImpersonateMember(actorRole, user.role),
    isSelf,
  });
}
