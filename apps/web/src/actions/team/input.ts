import { validationError } from "~/lib/app-errors";
import type { Role } from "~/lib/auth/access/rbac";
import {
  assertNonEmptyString,
  assertPositiveInt,
} from "~/lib/contracts/guards";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { TeamId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  assertEmail,
  assertOptionalExpiresAt,
  assertOptionalTeamId,
  assertRole,
} from "./validators";

export function parseCreateTeamInviteInput(input: {
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: string;
  teamId?: number | null;
  expiresAt?: number | null;
}): {
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: Role;
  teamId: TeamId | null;
  expiresAt: number | null;
} {
  return {
    names: assertNonEmptyString(input.names, "names"),
    firstSurname: assertNonEmptyString(input.firstSurname, "firstSurname"),
    secondSurname: assertNonEmptyString(input.secondSurname, "secondSurname"),
    email: assertEmail(input.email),
    role: assertRole(input.role),
    teamId: assertOptionalTeamId(input.teamId),
    expiresAt: assertOptionalExpiresAt(input.expiresAt),
  };
}

export function parseInviteIdInput(
  inviteId: number,
): Result<{ inviteId: number }, DomainError> {
  try {
    return Ok({ inviteId: assertPositiveInt(inviteId, "inviteId") });
  } catch (error) {
    return Err(
      domainError(
        "validation",
        "team.invite_id.invalid",
        error instanceof Error ? error.message : "Invalid inviteId",
      ),
    );
  }
}

export function parseAcceptTeamInviteInput(input: {
  token: string;
  password: string;
}): { token: string; password: string } {
  const token = input.token.trim();
  if (token.length === 0) {
    throw validationError("token is required");
  }

  return {
    token,
    password: input.password,
  };
}
