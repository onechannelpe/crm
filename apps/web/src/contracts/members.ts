import type { Permission, Role } from "~/domain/auth/access/rbac";
import type { RoleOption } from "~/domain/auth/access/role-display";
import type { ExecutiveCategory } from "~/domain/identity/executive-category";
import type { CalendarDate } from "~/domain/time/calendar-date";

import type { TeamOption } from "./team";

export interface MemberListItem {
  id: string;
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: Role;
  executiveCategory: ExecutiveCategory | null;
  teamName: string | null;
  isActive: boolean;
  onboardingCompleted: boolean;
  avatarUrl: string | null;
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
  executiveCategory: ExecutiveCategory | null;
  teamId: string | null;
  teamName: string | null;
  branchName: string | null;
  isActive: boolean;
  onboardingCompleted: boolean;
  avatarUrl: string | null;
  expiresOn: CalendarDate | null;
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
  expiresOn: string | null;
}
