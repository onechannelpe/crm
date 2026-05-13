import { assertNonEmptyString, assertPositiveInt } from "~/contracts/guards";
import type { Role } from "~/lib/auth/access/rbac";
import type { ExecutiveCategoryValue } from "~/lib/db/types";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import type { TeamId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import {
  assertEmail,
  assertExecutiveCategory,
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
  executiveCategory?: string | null;
  teamId?: number | null;
  expiresAt?: number | null;
}): {
  names: string;
  firstSurname: string;
  secondSurname: string;
  email: string;
  role: Role;
  executiveCategory: ExecutiveCategoryValue | null;
  teamId: TeamId | null;
  expiresAt: number | null;
} {
  const role = assertRole(input.role);
  return {
    names: assertNonEmptyString(input.names, "names"),
    firstSurname: assertNonEmptyString(input.firstSurname, "firstSurname"),
    secondSurname: assertNonEmptyString(input.secondSurname, "secondSurname"),
    email: assertEmail(input.email),
    role,
    executiveCategory: assertExecutiveCategory(input.executiveCategory, role),
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
