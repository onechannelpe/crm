import type { Role } from "~/lib/auth/access/rbac";

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
  pendingInvites: TeamInvite[];
  canManageInvites: boolean;
}

export interface TeamOption {
  id: number;
  name: string;
}
