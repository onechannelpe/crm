import type { MemberListItem } from "~/contracts/members";
import type { UserId } from "~/server/shared/ids";
import { epochMilliseconds } from "~/server/shared/time";
import type { MemberRosterRow } from "~/server/users/repos-users";

// Other members' avatars are served through a dedicated, permission-gated route
// (the current user's own avatar has its own /api/me/avatar endpoint). The
// version participates in the URL so the browser cache invalidates on change.
export function memberAvatarUrl(
  userId: UserId,
  hasAvatar: boolean,
  version: number,
): string | null {
  return hasAvatar ? `/api/users/${userId}/avatar?v=${version}` : null;
}

export function toMemberListItem(row: MemberRosterRow): MemberListItem {
  return {
    id: row.id,
    names: row.names,
    firstSurname: row.first_surname,
    secondSurname: row.second_surname,
    email: row.email,
    role: row.role,
    executiveCategory: row.executive_category,
    teamName: row.team_name,
    isActive: row.is_active,
    onboardingCompleted: row.onboarding_completed_at !== null,
    avatarUrl: memberAvatarUrl(
      row.id,
      row.avatar_storage_key !== null,
      row.avatar_version,
    ),
    expiresAt: row.expires_at ? epochMilliseconds(row.expires_at) : null,
  };
}
