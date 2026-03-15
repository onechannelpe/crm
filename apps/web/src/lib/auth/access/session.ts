import type {
  PrimaryAuthMethod,
  SessionClass,
  StrongAuthMethod,
} from "../core/session-contract";
import { getSessionCookie } from "../session/cookies";
import { validateSessionToken } from "../session/session-manager";
import { hasPermission, type Permission, type Role } from "./rbac";

export interface SessionData {
  sessionId: string;
  userId: number;
  email?: string;
  role: Role;
  branchId: number;
  onboardingCompleted: boolean;
  sessionClass: SessionClass;
  primaryAuthMethod: PrimaryAuthMethod;
  strongAuthMethod: StrongAuthMethod | null;
  strongAuthAt: number | null;
}

export async function getSession(): Promise<SessionData | null> {
  const token = getSessionCookie();
  if (!token) return null;

  const { session } = await validateSessionToken(token);
  if (!session) return null;

  return {
    sessionId: session.id,
    userId: session.userId,
    role: session.role,
    branchId: session.branchId,
    onboardingCompleted: session.onboardingCompleted,
    sessionClass: session.sessionClass,
    primaryAuthMethod: session.primaryAuthMethod,
    strongAuthMethod: session.strongAuthMethod,
    strongAuthAt: session.strongAuthAt,
  };
}

export async function requireAuth(): Promise<SessionData> {
  const session = await getSession();

  if (!session) {
    throw new Error("Unauthorized");
  }

  if (session.sessionClass !== "app" || !session.onboardingCompleted) {
    throw new Error("Onboarding required");
  }

  return session;
}

export async function requireSession(): Promise<SessionData> {
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
