import type { Role } from "~/lib/auth/access/rbac";
import {
  isExecutiveCategoryValue,
  type ExecutiveCategoryValue,
} from "~/lib/db/types";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { CreateTeamInviteCommand } from "../application/contracts";

// The boundary has proven each field is present and well typed; this owns the
// invite's cross-field and format rules, so single and future bulk creation
// paths enforce them identically. Email is validated for shape only; the
// invites domain lower-cases and dedupes it.
export type TeamInviteShape = {
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: Role;
  executiveCategory: string | null;
  teamId: number | null;
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

  if (
    input.teamId !== null &&
    (!Number.isInteger(input.teamId) || input.teamId < 1)
  ) {
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

// Category applies only to executives; for every other role it is dropped so a
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
): Result<number | null, DomainError> {
  if (expiresAt === null) {
    return Ok(null);
  }

  if (!Number.isInteger(expiresAt) || expiresAt < 1) {
    return Err(fail("invalid_expires_at"));
  }

  if (expiresAt <= Date.now() + MIN_EXPIRY_OFFSET_MS) {
    return Err(fail("expires_at_too_soon"));
  }

  return Ok(expiresAt);
}
