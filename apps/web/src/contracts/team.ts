import type { Role } from "~/lib/auth/access/rbac";
import type { RoleOption } from "~/lib/auth/access/role-display";

export interface BulkImportSetup {
  assignableRoles: RoleOption[];
}

export interface TeamInvite {
  inviteId: string;
  userId: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: Role;
  teamId: string | null;
  inviteUrl: string;
  expiresAt: number;
  createdAt: number;
  lastDeliveredAt: number | null;
}

export interface TeamOption {
  id: string;
  name: string;
}

export interface InviteManagement {
  pendingInvites: TeamInvite[];
  teams: TeamOption[];
  assignableRoles: RoleOption[];
}

export interface CreateTeamInviteInput {
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: string;
  executiveCategory: string | null;
  teamId: string | null;
  expiresAt: number | null;
}
