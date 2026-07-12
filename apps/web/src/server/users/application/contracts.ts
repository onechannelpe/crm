import type { Role } from "~/lib/auth/access/rbac";
import type { ExecutiveCategoryValue } from "~/lib/db/types";
import type { TeamId, UserId } from "~/server/shared/ids";

export interface UpdateMemberProfileCommand {
  userId: UserId;
  names: string;
  firstSurname: string;
  secondSurname: string;
  teamId: TeamId | null;
  executiveCategory: ExecutiveCategoryValue | null;
}

export interface ChangeMemberRoleCommand {
  userId: UserId;
  role: Role;
  executiveCategory: ExecutiveCategoryValue | null;
}

export interface UpdateMemberExpiryCommand {
  userId: UserId;
  expiresAt: Date | null;
}

export interface MemberIdCommand {
  userId: UserId;
}
