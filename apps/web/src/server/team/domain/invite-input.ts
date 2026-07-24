import type { Role } from "~/lib/auth/access/rbac";
import {
  isExecutiveCategoryValue,
  type ExecutiveCategoryValue,
} from "~/lib/db/types";
import { appCalendarDateAt, appDayRange } from "~/lib/time/app-time";
import { addCalendarDays, type CalendarDate } from "~/lib/time/calendar-date";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { TeamId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { CreateTeamInviteCommand } from "../application/contracts";

// Cross-field and format rules: applied identically by single and bulk
// creation paths. Email is shape-only here; the invites domain lower-cases
// and dedupes.
export type TeamInviteShape = {
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: Role;
  executiveCategory: string | null;
  teamId: TeamId | null;
  expiresOn: CalendarDate | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_EXPIRY_DAYS = 7;

export function validateTeamInviteInput(
  input: TeamInviteShape,
  now: Date,
): Result<CreateTeamInviteCommand, DomainError> {
  if (!EMAIL_PATTERN.test(input.email)) {
    return Err(fail("invalid_email"));
  }

  const category = resolveExecutiveCategory(
    input.role,
    input.executiveCategory,
  );

  if (!category.ok) {
    return category;
  }

  if (input.teamId !== null && input.teamId.trim().length === 0) {
    return Err(fail("invalid_team_id"));
  }

  const expiresAt = validateExpiry(input.expiresOn, now);

  if (!expiresAt.ok) {
    return expiresAt;
  }

  return Ok({
    names: input.names,
    firstSurname: input.firstSurname,
    secondSurname: input.secondSurname,
    email: input.email,
    role: input.role,
    executiveCategory: category.value,
    teamId: input.teamId,
    expiresAt: expiresAt.value,
  });
}

// Category applies only to executives; for other roles it is dropped so a
// stray value cannot smuggle a category onto a non-executive invite.
function resolveExecutiveCategory(
  role: Role,
  executiveCategory: string | null,
): Result<ExecutiveCategoryValue | null, DomainError> {
  if (role !== "executive") {
    return Ok(null);
  }

  if (!executiveCategory || !isExecutiveCategoryValue(executiveCategory)) {
    return Err(fail("invalid_executive_category"));
  }

  return Ok(executiveCategory);
}

function validateExpiry(
  expiresOn: CalendarDate | null,
  now: Date,
): Result<Date | null, DomainError> {
  if (expiresOn === null) {
    return Ok(null);
  }

  const minimum = addCalendarDays(appCalendarDateAt(now), MIN_EXPIRY_DAYS);
  if (expiresOn < minimum) {
    return Err(fail("expires_on_too_soon"));
  }

  return Ok(appDayRange(expiresOn).endExclusive);
}
