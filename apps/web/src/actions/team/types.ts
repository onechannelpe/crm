import type { Role } from "~/lib/auth/access/rbac";
import type { RoleOption } from "~/lib/auth/access/role-display";

export interface TeamMember {
  id: number;
  fullName: string;
  email: string;
  role: Role;
  teamId: number | null;
  isActive: boolean;
}

export interface TeamInvite {
  inviteId: number;
  userId: number;
  fullName: string;
  email: string;
  role: Role;
  teamId: number | null;
  expiresAt: number;
  createdAt: number;
  sentAt: number | null;
}

export interface TeamOption {
  id: number;
  name: string;
}

export interface InviteManagement {
  pendingInvites: TeamInvite[];
  teams: TeamOption[];
  assignableRoles: RoleOption[];
}
