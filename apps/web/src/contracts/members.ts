import type { Permission, Role } from "~/lib/auth/access/rbac";
import type { RoleOption } from "~/lib/auth/access/role-display";
import type { ExecutiveCategoryValue } from "~/lib/db/types";

import type { TeamOption } from "./team";

export interface MemberListItem {
  id: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: Role;
  executiveCategory: ExecutiveCategoryValue | null;
  teamName: string | null;
  isActive: boolean;
  onboardingCompleted: boolean;
  avatarUrl: string | null;
  expiresAt: number | null;
}

export interface MembersRoster {
  members: MemberListItem[];
}

export interface MemberDetail {
  id: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: Role;
  executiveCategory: ExecutiveCategoryValue | null;
  teamId: string | null;
  teamName: string | null;
  branchName: string | null;
  isActive: boolean;
  onboardingCompleted: boolean;
  avatarUrl: string | null;
  expiresAt: number | null;
  permissions: Permission[];
  // Affordances derived from the acting administrator's role and identity, so
  // the client renders only the controls the server will actually authorize.
  assignableRoles: RoleOption[];
  teams: TeamOption[];
  canManage: boolean;
  canDelete: boolean;
  canImpersonate: boolean;
  isSelf: boolean;
}

export interface UpdateMemberProfileInput {
  userId: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  teamId: string | null;
  executiveCategory: string | null;
}

export interface ChangeMemberRoleInput {
  userId: string;
  role: string;
  executiveCategory: string | null;
}

export interface UpdateMemberExpiryInput {
  userId: string;
  expiresAt: number | null;
}
