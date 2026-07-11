import type { Role } from "~/lib/auth/access/rbac";
import {
  isExecutiveCategoryValue,
  type ExecutiveCategoryValue,
} from "~/lib/db/types";
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
  expiresAt: number | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_EXPIRY_OFFSET_MS = 7 * 24 * 60 * 60 * 1000;

export function validateTeamInviteInput(
  input: TeamInviteShape,
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

  const expiresAt = validateExpiry(input.expiresAt);

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
  expiresAt: number | null,
): Result<Date | null, DomainError> {
  if (expiresAt === null) {
    return Ok(null);
  }

  if (!Number.isInteger(expiresAt) || expiresAt < 1) {
    return Err(fail("invalid_expires_at"));
  }

  if (expiresAt <= Date.now() + MIN_EXPIRY_OFFSET_MS) {
    return Err(fail("expires_at_too_soon"));
  }

  return Ok(new Date(expiresAt));
}
