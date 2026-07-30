import {
  hasPermission,
  type Permission,
  type Role,
} from "~/domain/auth/access/rbac";
import type { AuthSession } from "~/domain/auth/access/session-types";
import {
  fail,
  forbidden,
  unauthenticated,
  type DomainError,
} from "~/domain/errors";
import { getRequestContext } from "~/server/platform/http/request-context";
import { Err, Ok, type Result } from "~/shared/result";

export async function getSession(): Promise<AuthSession | null> {
  return getRequestContext().principal;
}

export async function authenticate(): Promise<
  Result<AuthSession, DomainError>
> {
  const session = await getSession();
  if (!session) {
    return Err(unauthenticated());
  }
  if (session.sessionClass !== "app") {
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
