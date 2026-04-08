import type { Role } from "~/lib/auth/access/rbac";
import type { RoleOption } from "~/lib/auth/access/role-display";
import type { ExecutiveCategoryValue } from "~/lib/db/types";

export interface BulkImportSetup {
  assignableRoles: RoleOption[];
}

export interface BulkImportRow {
  firstSurname: string;
  secondSurname: string;
  names: string;
  email: string;
  expiresAt: number | null;
  executiveCategory: ExecutiveCategoryValue | null;
}

export type BulkRowError = {
  row: number;
  message: string;
};

export interface BulkParseResult {
  valid: BulkImportRow[];
  errors: BulkRowError[];
}

export interface BulkApplyResult {
  created: number;
  skipped: number;
  rowErrors: string[];
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
  teamId: number | null;
  expiresAt: number | null;
}

export interface AcceptTeamInviteCommand {
  token: string;
  password: string;
}
