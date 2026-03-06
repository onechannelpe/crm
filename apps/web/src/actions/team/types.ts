import type { Role } from "~/lib/auth/access/rbac";
import type { RoleOption } from "~/lib/auth/access/role-display";

export interface BulkImportSetup {
  assignableRoles: RoleOption[];
}

export interface TeamMember {
  id: number;
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: Role;
  teamId: number | null;
  isActive: boolean;
  expiresAt: number | null;
  extensionStatus:
    | "idle"
    | "ready"
    | "dialing"
    | "active"
    | "wrap_up"
    | "sync_pending"
    | "sync_error"
    | "offline"
    | null;
  extensionUpdatedAt: number | null;
}

export interface TeamInvite {
  inviteId: number;
  userId: number;
  names: string;
  firstSurname: string;
  secondSurname: string;
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
