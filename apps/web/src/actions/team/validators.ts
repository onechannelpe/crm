import { validationError } from "~/lib/app-errors";
import { isRole, type Role } from "~/lib/auth/access/rbac";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import {
  isExecutiveCategoryValue,
  type ExecutiveCategoryValue,
} from "~/lib/db/types";
import { asTeamId, isTeamId, type TeamId } from "~/server/shared/ids";

export function assertEmail(value: string): string {
  const safe = assertNonEmptyString(value, "email").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safe)) {
    throw validationError("email must be valid");
  }
  return safe;
}

export function assertRole(value: string): Role {
  if (!isRole(value)) {
    throw validationError("role is invalid");
  }
  return value;
}

export function assertExecutiveCategory(
  value: string | null | undefined,
  role: Role,
): ExecutiveCategoryValue | null {
  if (role !== "executive") return null;
  if (!value || !isExecutiveCategoryValue(value)) {
    throw validationError(
      "executiveCategory must be 'elite' or 'corporativa' for executives",
    );
  }
  return value;
}

export function assertOptionalTeamId(
  value: string | null | undefined,
): TeamId | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (!isTeamId(value)) {
    throw validationError("teamId is invalid");
  }
  return asTeamId(value);
}

const MIN_EXPIRY_OFFSET_MS = 7 * 24 * 60 * 60 * 1000;

export function assertOptionalExpiresAt(
  value: number | null | undefined,
): number | null {
  if (value === null || value === undefined) {
    return null;
  }
  const ts = assertPositiveInt(value, "expiresAt");
  if (ts <= Date.now() + MIN_EXPIRY_OFFSET_MS) {
    throw validationError("expiresAt must be at least 7 days in the future");
  }
  return ts;
}

export function assertStrongPassword(value: string): string {
  const safe = assertNonEmptyString(value, "password");
  if (safe.length < 12) {
    throw validationError("password must contain at least 12 characters");
  }
  if (!/[A-Z]/.test(safe)) {
    throw validationError("password must include an uppercase letter");
  }
  if (!/[a-z]/.test(safe)) {
    throw validationError("password must include a lowercase letter");
  }
  if (!/[0-9]/.test(safe)) {
    throw validationError("password must include a number");
  }
  return safe;
}
