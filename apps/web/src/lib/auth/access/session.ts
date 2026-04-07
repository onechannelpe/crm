import { getRequestContext } from "~/lib/http/request-context";

import { hasPermission, type Permission, type Role } from "./rbac";
import type { AuthSession } from "./session-types";

export async function getSession(): Promise<AuthSession | null> {
  const session = await getRequestContext().getAuthSession();
  if (!session) return null;

  return session;
}

export async function requireAuth(): Promise<AuthSession> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  if (session.sessionClass !== "app" || !session.onboardingCompleted) {
    throw new Error("Onboarding required");
  }

  return session;
}

export async function requireSession(): Promise<AuthSession> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
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

export async function requireRole(role: Role) {
  const session = await requireAuth();
  if (!hasRole(session.role, role)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();
  if (!hasPermission(session.role, permission)) {
    throw new Error("Forbidden");
  }
  return session;
}
