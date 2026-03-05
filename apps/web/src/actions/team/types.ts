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

export interface TeamDirectory {
  members: TeamMember[];
  inviteManagement: TeamInviteManagement | null;
}

export interface TeamOption {
  id: number;
  name: string;
}

export interface TeamInviteManagement {
  pendingInvites: TeamInvite[];
  teams: TeamOption[];
  assignableRoles: RoleOption[];
  inviteLink: TeamInviteLinkState;
}

export interface TeamInviteLinkState {
  status: "enabled" | "unavailable";
  url: string | null;
  reason: string | null;
}
