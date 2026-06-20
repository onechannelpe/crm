import { getRequestContext } from "~/lib/http/request-context";
import {
  fail,
  forbidden,
  unauthenticated,
  type DomainError,
} from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { hasPermission, type Permission, type Role } from "./rbac";
import type { AuthSession } from "./session-types";

export async function getSession(): Promise<AuthSession | null> {
  return getRequestContext().getAuthSession();
}

// Result-returning core. The action runtime consumes these so that an auth
// denial is an outcome in the same Result channel as parsing and execution, not
// a thrown exception that loses its kind. The throwing facades below wrap these
// for the raw (non-runAction) callers in routes and standalone actions.

export async function authenticate(): Promise<
  Result<AuthSession, DomainError>
> {
  const session = await getSession();
  if (!session) {
    return Err(unauthenticated());
  }
  if (session.sessionClass !== "app" || !session.onboardingCompleted) {
    return Err(fail("onboarding_required"));
  }
  return Ok(session);
}

export async function authenticateSession(): Promise<
  Result<AuthSession, DomainError>
> {
  const session = await getSession();
  if (!session) {
    return Err(unauthenticated());
  }
  return Ok(session);
}

const ROLE_HIERARCHY: Record<Role, number> = {
  executive: 0,
  supervisor: 1,
  back_office: 1,
  sales_manager: 2,
  logistics: 2,
  hr: 2,
  admin: 3,
  superuser: 4,
};

export function hasRole(userRole: Role, requiredRole: Role): boolean {
  const userLevel = ROLE_HIERARCHY[userRole];
  const requiredLevel = ROLE_HIERARCHY[requiredRole] ?? 99;
  return userLevel >= requiredLevel;
}

export function authorizeRole(
  session: AuthSession,
  role: Role,
): Result<AuthSession, DomainError> {
  if (!hasRole(session.role, role)) {
    return Err(forbidden());
  }
  return Ok(session);
}

export function authorizePermission(
  session: AuthSession,
  permission: Permission,
): Result<AuthSession, DomainError> {
  if (!hasPermission(session.role, permission)) {
    return Err(forbidden());
  }
  return Ok(session);
}
