import type { NewUserSession } from "~/lib/db/types";
import { createLogger } from "~/lib/observability/logger";
import { repos } from "~/server/shared/context";
import { asBranchId, asUserId } from "~/server/shared/ids";
import type { BranchId, UserId } from "~/server/shared/ids";
import type { Repositories } from "~/server/shared/registry";

import { isRole, type Role } from "../access/rbac";
import type { AuthSession } from "../access/session-types";
import {
  isPrimaryAuthMethod,
  isSessionClass,
  isStrongAuthMethod,
  type PrimaryAuthMethod,
  type SessionClass,
  type StrongAuthMethod,
} from "../core/session-contract";
import { sessionCache } from "./session-cache";
import {
  generateSessionToken,
  hashSessionToken,
  isValidTokenFormat,
} from "./tokens";

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;
const ACTIVITY_UPDATE_THRESHOLD = 5 * 60 * 1000;
const EXTENSION_THRESHOLD = 7 * 24 * 60 * 60 * 1000;
const logger = createLogger("session-manager");

export interface SessionValidationResult {
  session: AuthSession | null;
}

type SessionDeps = Pick<Repositories, "sessions" | "users">;

function getSessionDeps(deps?: SessionDeps): SessionDeps {
  return deps ?? repos;
}

async function getSessionUser(
  userId: UserId,
  deps: SessionDeps,
): ReturnType<SessionDeps["users"]["findById"]> {
  return deps.users.findById(userId);
}

function isSessionConsistent(params: {
  user: Awaited<ReturnType<SessionDeps["users"]["findById"]>>;
  branchId: BranchId;
  role: Role;
}): boolean {
  const { user, branchId, role } = params;
  if (!user?.is_active) return false;
  if (user.branch_id !== branchId) return false;
  if (user.role !== role) return false;
  return true;
}

export async function createSession(
  params: {
    userId: number;
    branchId: number;
    role: Role;
    sessionClass: SessionClass;
    ipAddress: string | null;
    userAgent: string | null;
    primaryAuthMethod: PrimaryAuthMethod;
    strongAuthMethod: StrongAuthMethod | null;
    strongAuthAt: number | null;
  },
  deps?: SessionDeps,
): Promise<string> {
  const { sessions } = getSessionDeps(deps);
  const token = generateSessionToken();
  const sessionId = hashSessionToken(token);
  const now = Date.now();

  const newSession: NewUserSession = {
    id: sessionId,
    user_id: params.userId,
    branch_id: params.branchId,
    role: params.role,
    session_class: params.sessionClass,
    primary_auth_method: params.primaryAuthMethod,
    strong_auth_method: params.strongAuthMethod,
    strong_auth_at: params.strongAuthAt,
    ip_address: params.ipAddress,
    user_agent: params.userAgent,
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
    if (
      (cached.sessionClass === "app" && !onboardingCompleted) ||
      (cached.sessionClass === "pre_auth" && onboardingCompleted)
    ) {
      await sessions.delete(sessionId);
      sessionCache.delete(sessionId);
      return { session: null };
    }
    if (cached.onboardingCompleted !== onboardingCompleted) {
      sessionCache.set(sessionId, {
        userId: cached.userId,
        branchId: cached.branchId,
        role: cached.role,
        onboardingCompleted,
        sessionClass: cached.sessionClass,
        primaryAuthMethod: cached.primaryAuthMethod,
        strongAuthMethod: cached.strongAuthMethod,
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
        sessionClass: cached.sessionClass,
        primaryAuthMethod: cached.primaryAuthMethod,
        strongAuthMethod: cached.strongAuthMethod,
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
  if (!isSessionClass(dbSession.session_class)) {
    await sessions.delete(sessionId);
    return { session: null };
  }
  if (!isPrimaryAuthMethod(dbSession.primary_auth_method)) {
    await sessions.delete(sessionId);
    return { session: null };
  }
  if (
    dbSession.strong_auth_method !== null &&
    !isStrongAuthMethod(dbSession.strong_auth_method)
  ) {
    await sessions.delete(sessionId);
    return { session: null };
  }

  if (dbSession.expires_at < now) {
    await sessions.delete(sessionId);
    return { session: null };
  }

  const user = await getSessionUser(asUserId(dbSession.user_id), resolvedDeps);
  if (
    !isSessionConsistent({
      user,
      branchId: asBranchId(dbSession.branch_id),
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
  const onboardingCompleted = sessionUser.onboarding_completed_at !== null;

  if (
    (dbSession.session_class === "app" && !onboardingCompleted) ||
    (dbSession.session_class === "pre_auth" && onboardingCompleted)
  ) {
    await sessions.delete(sessionId);
    return { session: null };
  }

  if (now - dbSession.last_activity > ACTIVITY_UPDATE_THRESHOLD) {
    sessions.updateActivity(sessionId, now).catch((error: unknown) => {
      logger.error("update_activity_failed", { sessionId, error });
    });
  }

  if (dbSession.expires_at - now < EXTENSION_THRESHOLD) {
    const newExpiry = now + SESSION_DURATION;
    sessions.extendExpiry(sessionId, newExpiry).catch((error: unknown) => {
      logger.error("extend_expiry_failed", { sessionId, error });
    });
    dbSession.expires_at = newExpiry;
  }

  sessionCache.set(sessionId, {
    userId: asUserId(dbSession.user_id),
    branchId: asBranchId(dbSession.branch_id),
    role: dbSession.role,
    onboardingCompleted,
    sessionClass: dbSession.session_class,
    primaryAuthMethod: dbSession.primary_auth_method,
    strongAuthMethod: dbSession.strong_auth_method,
    strongAuthAt: dbSession.strong_auth_at,
    expiresAt: dbSession.expires_at,
  });

  return {
    session: {
      id: sessionId,
      userId: asUserId(dbSession.user_id),
      branchId: asBranchId(dbSession.branch_id),
      role: dbSession.role,
      onboardingCompleted,
      sessionClass: dbSession.session_class,
      primaryAuthMethod: dbSession.primary_auth_method,
      strongAuthMethod: dbSession.strong_auth_method,
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
  userId: UserId,
  deps?: SessionDeps,
): Promise<void> {
  await getSessionDeps(deps).sessions.deleteAllForUser(userId);
  sessionCache.deleteByUserId(userId);
}
