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
  extensionPresenceStatus:
    | "idle"
    | "ready"
    | "dialing"
    | "active"
    | "wrap_up"
    | "offline"
    | null;
  extensionSyncHealth: "ok" | "reauth_required" | null;
  extensionPresenceUpdatedAt: number | null;
  extensionSyncUpdatedAt: number | null;
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
