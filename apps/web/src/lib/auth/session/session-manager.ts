import type { NewUserSession } from "~/lib/db/schema";
import { repos } from "~/server/shared/context";
import type { Repositories } from "~/server/shared/registry";

import { isRole, type Role } from "../access/rbac";
import type { AuthSession } from "../access/session-types";
import { sessionCache } from "./session-cache";
import {
  generateSessionToken,
  hashSessionToken,
  isValidTokenFormat,
} from "./tokens";

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;
const ACTIVITY_UPDATE_THRESHOLD = 5 * 60 * 1000;
const EXTENSION_THRESHOLD = 7 * 24 * 60 * 60 * 1000;
const AUTH_METHODS = ["password", "password_totp", "passkey"] as const;

export interface SessionValidationResult {
  session: AuthSession | null;
}

type SessionDeps = Pick<Repositories, "sessions" | "users">;

function getSessionDeps(deps?: SessionDeps): SessionDeps {
  return deps ?? repos;
}

async function getSessionUser(
  userId: number,
  deps: SessionDeps,
): ReturnType<SessionDeps["users"]["findById"]> {
  return deps.users.findById(userId);
}

function isSessionConsistent(params: {
  user: Awaited<ReturnType<SessionDeps["users"]["findById"]>>;
  branchId: number;
  role: Role;
}): boolean {
  const { user, branchId, role } = params;
  if (!user?.is_active) return false;
  if (user.branch_id !== branchId) return false;
  if (user.role !== role) return false;
  return true;
}

function isValidAuthMethod(
  value: string,
): value is (typeof AUTH_METHODS)[number] {
  return AUTH_METHODS.some((method) => method === value);
}

export async function createSession(
  userId: number,
  branchId: number,
  role: Role,
  ipAddress: string | null,
  userAgent: string | null,
  authMethod: "password" | "password_totp" | "passkey",
  strongAuthAt: number | null,
  deps?: SessionDeps,
): Promise<string> {
  const { sessions } = getSessionDeps(deps);
  const token = generateSessionToken();
  const sessionId = hashSessionToken(token);
  const now = Date.now();

  const newSession: NewUserSession = {
    id: sessionId,
    user_id: userId,
    branch_id: branchId,
    role,
    auth_method: authMethod,
    strong_auth_at: strongAuthAt,
    ip_address: ipAddress,
    user_agent: userAgent,
    created_at: now,
    last_activity: now,
    expires_at: now + SESSION_DURATION,
  };

  await sessions.create(newSession);

  return token;
}

export async function validateSessionToken(
  token: string,
  deps?: SessionDeps,
): Promise<SessionValidationResult> {
  if (!isValidTokenFormat(token)) {
    return { session: null };
  }
  const { sessions } = getSessionDeps(deps);
  const resolvedDeps = getSessionDeps(deps);

  const sessionId = hashSessionToken(token);
  const now = Date.now();

  const cached = sessionCache.get(sessionId);
  if (cached) {
    const user = await getSessionUser(cached.userId, resolvedDeps);
    if (
      !isSessionConsistent({
        user,
        branchId: cached.branchId,
        role: cached.role,
      })
    ) {
      await sessions.delete(sessionId);
      sessionCache.delete(sessionId);
      return { session: null };
    }
    if (!user) {
      await sessions.delete(sessionId);
      sessionCache.delete(sessionId);
      return { session: null };
    }
    const onboardingCompleted = user.onboarding_completed_at !== null;
    if (cached.onboardingCompleted !== onboardingCompleted) {
      sessionCache.set(sessionId, {
        userId: cached.userId,
        branchId: cached.branchId,
        role: cached.role,
        onboardingCompleted,
        authMethod: cached.authMethod,
        strongAuthAt: cached.strongAuthAt,
        expiresAt: cached.expiresAt,
      });
    }
    return {
      session: {
        id: sessionId,
        userId: cached.userId,
        branchId: cached.branchId,
        role: cached.role,
        onboardingCompleted,
        authMethod: cached.authMethod,
        strongAuthAt: cached.strongAuthAt,
      },
    };
  }

  const dbSession = await sessions.findById(sessionId);

  if (!dbSession) {
    return { session: null };
  }

  if (!isRole(dbSession.role)) {
    await sessions.delete(sessionId);
    return { session: null };
  }
  if (!isValidAuthMethod(dbSession.auth_method)) {
    await sessions.delete(sessionId);
    return { session: null };
  }

  if (dbSession.expires_at < now) {
    await sessions.delete(sessionId);
    return { session: null };
  }

  const user = await getSessionUser(dbSession.user_id, resolvedDeps);
  if (
    !isSessionConsistent({
      user,
      branchId: dbSession.branch_id,
      role: dbSession.role,
    })
  ) {
    await sessions.delete(sessionId);
    return { session: null };
  }
  if (!user) {
    await sessions.delete(sessionId);
    return { session: null };
  }
  const sessionUser = user;

  if (now - dbSession.last_activity > ACTIVITY_UPDATE_THRESHOLD) {
    sessions.updateActivity(sessionId, now).catch(console.error);
  }

  if (dbSession.expires_at - now < EXTENSION_THRESHOLD) {
    const newExpiry = now + SESSION_DURATION;
    sessions.extendExpiry(sessionId, newExpiry).catch(console.error);
    dbSession.expires_at = newExpiry;
  }

  sessionCache.set(sessionId, {
    userId: dbSession.user_id,
    branchId: dbSession.branch_id,
    role: dbSession.role,
    onboardingCompleted: sessionUser.onboarding_completed_at !== null,
    authMethod: dbSession.auth_method,
    strongAuthAt: dbSession.strong_auth_at,
    expiresAt: dbSession.expires_at,
  });

  return {
    session: {
      id: sessionId,
      userId: dbSession.user_id,
      branchId: dbSession.branch_id,
      role: dbSession.role,
      onboardingCompleted: sessionUser.onboarding_completed_at !== null,
      authMethod: dbSession.auth_method,
      strongAuthAt: dbSession.strong_auth_at,
    },
  };
}

export async function invalidateSession(
  sessionId: string,
  deps?: SessionDeps,
): Promise<void> {
  await getSessionDeps(deps).sessions.delete(sessionId);
  sessionCache.delete(sessionId);
}

export async function invalidateUserSessions(
  userId: number,
  deps?: SessionDeps,
): Promise<void> {
  await getSessionDeps(deps).sessions.deleteAllForUser(userId);
  sessionCache.deleteByUserId(userId);
}
