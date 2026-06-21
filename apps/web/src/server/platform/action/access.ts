import type { Permission, Role } from "~/lib/auth/access/rbac";
import {
  authenticate,
  authenticateSession,
  authorizePermission,
  authorizeRole,
} from "~/lib/auth/access/session";
import type { AuthSession } from "~/lib/auth/access/session-types";
import { checkRecentStrongAuth } from "~/lib/auth/security/step-up";
import { type DomainError } from "~/server/shared/domain-error";
import { isErr, Ok, type Result } from "~/server/shared/result";

export type ActionAccess =
  | { kind: "permission"; permission: Permission }
  | { kind: "role"; role: Role }
  | { kind: "auth" }
  | { kind: "session" };

export type ActionStepUpRequirement = {
  stepUp?: "recent_strong_auth";
};

export function authenticateAccess(
  access: ActionAccess,
): Promise<Result<AuthSession, DomainError>> {
  return access.kind === "session" ? authenticateSession() : authenticate();
}

function authorizeFor(
  actor: AuthSession,
  access: ActionAccess,
): Result<AuthSession, DomainError> {
  switch (access.kind) {
    case "permission":
      return authorizePermission(actor, access.permission);
    case "role":
      return authorizeRole(actor, access.role);
    case "auth":
    case "session":
      return Ok(actor);
    default: {
      const unreachable: never = access;
      throw new Error(String(unreachable));
    }
  }
}

export function authorizeAccess(
  actor: AuthSession,
  access: ActionAccess,
  stepUp: ActionStepUpRequirement["stepUp"],
): Result<AuthSession, DomainError> {
  const authorized = authorizeFor(actor, access);
  if (isErr(authorized)) return authorized;

  if (stepUp === "recent_strong_auth") {
    const strong = checkRecentStrongAuth(actor);
    if (isErr(strong)) return strong;
  }

  return Ok(actor);
}
