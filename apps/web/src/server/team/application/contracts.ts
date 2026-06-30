import type { Role } from "~/lib/auth/access/rbac";
import type { ExecutiveCategoryValue } from "~/lib/db/types";
import type { TeamId } from "~/server/shared/ids";

export interface InviteInfo {
  fullName: string;
  username: string;
  email: string;
}

export interface CreateTeamInviteCommand {
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: Role;
  executiveCategory: ExecutiveCategoryValue | null;
  teamId: TeamId | null;
  expiresAt: Date | null;
}
