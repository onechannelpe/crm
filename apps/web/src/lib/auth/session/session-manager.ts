import type { NewUserSession } from "~/lib/db/schema";
import type { Repositories } from "~/server/shared/registry";

import { repos } from "~/server/shared/context";

import type { AuthSession } from "../access/session-types";

import { isRole, type Role } from "../access/rbac";
import { sessionCache } from "./session-cache";
import {
  generateSessionToken,
  hashSessionToken,
  isValidTokenFormat,
} from "./tokens";

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;
const ACTIVITY_UPDATE_THRESHOLD = 5 * 60 * 1000;
const EXTENSION_THRESHOLD = 7 * 24 * 60 * 60 * 1000;

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

export async function createSession(
  userId: number,
  branchId: number,
  role: Role,
  ipAddress: string | null,
  userAgent: string | null,
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
    return {
      session: {
        id: sessionId,
        userId: cached.userId,
        branchId: cached.branchId,
        role: cached.role,
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
    expiresAt: dbSession.expires_at,
  });

  return {
    session: {
      id: sessionId,
      userId: dbSession.user_id,
      branchId: dbSession.branch_id,
      role: dbSession.role,
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
