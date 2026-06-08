import type { Role } from "~/lib/auth/access/rbac";
import {
  isExecutiveCategoryValue,
  type ExecutiveCategoryValue,
} from "~/lib/db/types";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { CreateTeamInviteCommand } from "../application/contracts";

// The boundary has proven each field is present and well typed; this owns the
// invite's cross-field and format rules, so single and (future) bulk creation
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

function invalid(code: string, message: string): Result<never, DomainError> {
  return Err(domainError("validation", code, message));
}

export function validateTeamInviteInput(
  input: TeamInviteShape,
): Result<CreateTeamInviteCommand, DomainError> {
  if (!EMAIL_PATTERN.test(input.email)) {
    return invalid("invalid_email", "El correo no es válido.");
  }

  const category = resolveExecutiveCategory(
    input.role,
    input.executiveCategory,
  );
  if (!category.ok) return category;

  if (
    input.teamId !== null &&
    (!Number.isInteger(input.teamId) || input.teamId < 1)
  ) {
    return invalid("invalid_team_id", "El equipo seleccionado no es válido.");
  }

  const expiresAt = validateExpiry(input.expiresAt);
  if (!expiresAt.ok) return expiresAt;

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
  value: string | null,
): Result<ExecutiveCategoryValue | null, DomainError> {
  if (role !== "executive") return Ok(null);
  if (!value || !isExecutiveCategoryValue(value)) {
    return invalid(
      "invalid_executive_category",
      "Selecciona una categoría válida para el ejecutivo.",
    );
  }
  return Ok(value);
}

function validateExpiry(
  expiresAt: number | null,
): Result<number | null, DomainError> {
  if (expiresAt === null) return Ok(null);
  if (!Number.isInteger(expiresAt) || expiresAt < 1) {
    return invalid("invalid_expires_at", "La fecha de expiración es inválida.");
  }
  if (expiresAt <= Date.now() + MIN_EXPIRY_OFFSET_MS) {
    return invalid(
      "expires_at_too_soon",
      "La expiración debe ser al menos 7 días en el futuro.",
    );
  }
  return Ok(expiresAt);
}
