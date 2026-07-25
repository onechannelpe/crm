import type { Role } from "~/domain/auth/access/rbac";
import type { ExecutiveCategory } from "~/domain/identity/executive-category";
import type { TeamId } from "~/domain/ids";

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
  executiveCategory: ExecutiveCategory | null;
  teamId: TeamId | null;
  expiresAt: Date | null;
}
