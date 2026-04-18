import type { Role } from "~/lib/auth/access/rbac";
import type { RoleOption } from "~/lib/auth/access/role-display";
import type { ExecutiveCategoryValue } from "~/lib/db/types";
import type { TeamId, UserId } from "~/server/shared/ids";

export interface BulkImportSetup {
  assignableRoles: RoleOption[];
}

export interface TeamInvite {
  inviteId: number;
  userId: UserId;
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: Role;
  teamId: TeamId | null;
  expiresAt: number;
  createdAt: number;
  sentAt: number | null;
}

export interface TeamOption {
  id: TeamId;
  name: string;
}

export interface InviteManagement {
  pendingInvites: TeamInvite[];
  teams: TeamOption[];
  assignableRoles: RoleOption[];
}

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
  expiresAt: number | null;
}
