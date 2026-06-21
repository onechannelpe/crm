import { isRole } from "~/lib/auth/access/rbac";
import {
  isPrimaryAuthMethod,
  isSessionClass,
  isStrongAuthMethod,
} from "~/lib/auth/core/session-contract";
import { sessionCache } from "~/lib/auth/session/session-cache";
import {
  mapUserSessionRowToAuthSession,
  mapUserToSessionIdentity,
} from "~/lib/auth/session/session-mappers";
import {
  generateSessionToken,
  hashSessionToken,
  isValidTokenFormat,
} from "~/lib/auth/session/tokens";
import type { UserId } from "~/server/shared/ids";

import type {
  AuthSession,
  IssuedSession,
  SessionServiceDeps,
  SessionSpec,
} from "./session-spec";

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;
const ACTIVITY_UPDATE_THRESHOLD = 5 * 60 * 1000;
const EXTENSION_THRESHOLD = 7 * 24 * 60 * 60 * 1000;

const noopLogger = {
  error() {},
};

export function createSessionService(deps: SessionServiceDeps) {
  const now = deps.now ?? Date.now;
  const logger = deps.logger ?? noopLogger;

  return {
    async establish(spec: SessionSpec): Promise<IssuedSession> {
      const identity = mapUserToSessionIdentity(spec.user);
      const token = generateSessionToken();
      const sessionId = hashSessionToken(token);
      const nowTs = now();

      await deps.sessions.create({
        id: sessionId,
        user_id: identity.userId,
        branch_id: identity.branchId,
        role: identity.role,
        session_class: spec.sessionClass,
        primary_auth_method: spec.primaryAuthMethod,
        strong_auth_method: spec.strongAuthMethod,
        strong_auth_at: spec.strongAuthAt,
        ip_address: spec.request.ipAddress,
        user_agent: spec.request.userAgent,
        created_at: nowTs,
        last_activity: nowTs,
        expires_at: nowTs + SESSION_DURATION,
      });

      if (spec.auditAction) {
        await deps.events.append({
          type: spec.auditAction,
          entityType: "user",
          entityId: spec.user.id,
          actorUserId: spec.user.id,
          occurredAt: nowTs,
        });
      }

      return {
        userId: identity.userId,
        role: identity.role,
        onboardingCompleted: identity.onboardingCompleted,
        sessionClass: spec.sessionClass,
        primaryAuthMethod: spec.primaryAuthMethod,
        strongAuthMethod: spec.strongAuthMethod,
        strongAuthAt: spec.strongAuthAt,
        token,
      };
    },

    async resolve(token: string): Promise<AuthSession | null> {
      if (!isValidTokenFormat(token)) {
        return null;
      }

      const sessionId = hashSessionToken(token);
      const nowTs = now();

      const cached = sessionCache.get(sessionId);
      if (cached) {
        return {
          id: sessionId,
          userId: cached.userId,
          branchId: cached.branchId,
          role: cached.role,
          onboardingCompleted: cached.onboardingCompleted,
          sessionClass: cached.sessionClass,
          primaryAuthMethod: cached.primaryAuthMethod,
          strongAuthMethod: cached.strongAuthMethod,
          strongAuthAt: cached.strongAuthAt,
        };
      }

      const dbSession = await deps.sessions.findById(sessionId);
      if (!dbSession) {
        return null;
      }

      if (!isRole(dbSession.role)) {
        await deps.sessions.delete(sessionId);
        return null;
      }
      if (!isSessionClass(dbSession.session_class)) {
        await deps.sessions.delete(sessionId);
        return null;
      }
      if (!isPrimaryAuthMethod(dbSession.primary_auth_method)) {
        await deps.sessions.delete(sessionId);
        return null;
      }
      if (
        dbSession.strong_auth_method !== null &&
        !isStrongAuthMethod(dbSession.strong_auth_method)
      ) {
        await deps.sessions.delete(sessionId);
        return null;
      }
      if (dbSession.expires_at < nowTs) {
        await deps.sessions.delete(sessionId);
        return null;
      }

      const user = await deps.users.findById(dbSession.user_id);
      if (!user || user.is_active !== 1) {
        await deps.sessions.delete(sessionId);
        return null;
      }
      if (user.expires_at !== null && user.expires_at <= nowTs) {
        await deps.users.deactivateIfExpired(user.id, nowTs);
        await deps.sessions.deleteAllForUser(user.id);
        return null;
      }

      if (nowTs - dbSession.last_activity > ACTIVITY_UPDATE_THRESHOLD) {
        deps.sessions
          .updateActivity(sessionId, nowTs)
          .catch((error: unknown) => {
            logger.error("update_activity_failed", { sessionId, error });
          });
      }

      if (dbSession.expires_at - nowTs < EXTENSION_THRESHOLD) {
        const newExpiry = nowTs + SESSION_DURATION;
        deps.sessions
          .extendExpiry(sessionId, newExpiry)
          .catch((error: unknown) => {
            logger.error("extend_expiry_failed", { sessionId, error });
          });
        dbSession.expires_at = newExpiry;
      }

      const authSession = mapUserSessionRowToAuthSession(sessionId, dbSession);

      sessionCache.set(sessionId, {
        userId: authSession.userId,
        branchId: authSession.branchId,
        role: authSession.role,
        onboardingCompleted: authSession.onboardingCompleted,
        sessionClass: authSession.sessionClass,
        primaryAuthMethod: authSession.primaryAuthMethod,
        strongAuthMethod: authSession.strongAuthMethod,
        strongAuthAt: authSession.strongAuthAt,
        expiresAt: dbSession.expires_at,
      });

      return authSession;
    },

    async revoke(sessionId: string): Promise<void> {
      await deps.sessions.delete(sessionId);
      sessionCache.delete(sessionId);
    },

    async revokeAllForUser(userId: UserId): Promise<void> {
      await deps.sessions.deleteAllForUser(userId);
      sessionCache.deleteByUserId(userId);
    },
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
