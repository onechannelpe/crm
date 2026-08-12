import type { Role } from "~/domain/auth/access/rbac";
import type { ExecutiveCategory } from "~/domain/identity/executive-category";
import type { TeamId, UserId } from "~/domain/ids";
import type { CalendarDate } from "~/domain/time/calendar-date";

export interface UpdateMemberProfileCommand {
  userId: UserId;
  names: string;
  firstSurname: string;
  secondSurname: string;
  teamId: TeamId | null;
  executiveCategory: ExecutiveCategory | null;
}

export interface ChangeMemberRoleCommand {
  userId: UserId;
  role: Role;
  executiveCategory: ExecutiveCategory | null;
}

export interface UpdateMemberExpiryCommand {
  userId: UserId;
  expiresOn: CalendarDate | null;
}
