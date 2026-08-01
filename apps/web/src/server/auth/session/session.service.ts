import { auditEntityId } from "~/domain/audit/entity";
import { isRole } from "~/domain/auth/access/rbac";
import {
  isPrimaryAuthMethod,
  isSessionClass,
  isStrongAuthMethod,
} from "~/domain/auth/core/session-contract";
import type { UserId } from "~/domain/ids";
import { addMilliseconds } from "~/domain/time/clock";
import { sessionCache } from "~/server/auth/session/session-cache";
import {
  mapUserSessionRowToAuthSession,
  mapUserToSessionIdentity,
} from "~/server/auth/session/session-mappers";
import {
  generateSessionToken,
  hashSessionToken,
  isValidTokenFormat,
} from "~/server/auth/session/tokens";

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
  const logger = deps.logger ?? noopLogger;
  const revokeSession = async (sessionId: string): Promise<void> => {
    await deps.sessions.delete(sessionId);
    sessionCache.delete(sessionId);
  };
  const revokeUserSessions = async (userId: UserId): Promise<void> => {
    await deps.sessions.deleteAllForUser(userId);
    sessionCache.deleteByUserId(userId);
  };

  return {
    async establish(spec: SessionSpec, now: Date): Promise<IssuedSession> {
      const identity = mapUserToSessionIdentity(spec.user);
      const token = generateSessionToken();
      const sessionId = hashSessionToken(token);
      const expiresAt = addMilliseconds(now, SESSION_DURATION);

      await deps.sessions.create({
        id: sessionId,
        user_id: identity.userId,
        branch_id: identity.branchId,
        role: identity.role,
        session_class: spec.sessionClass,
        primary_auth_method: spec.primaryAuthMethod,
        strong_auth_method: spec.strongAuthMethod,
        strong_auth_at: spec.strongAuthAt,
        impersonator_user_id: spec.impersonatorUserId ?? null,
        ip_address: spec.request.ipAddress,
        user_agent: spec.request.userAgent,
        created_at: now,
        last_activity: now,
        expires_at: expiresAt,
      });

      if (spec.auditAction) {
        await deps.events.append({
          type: spec.auditAction,
          entityType: "user",
          entityId: auditEntityId("user", spec.user.id),
          actorUserId: spec.user.id,
          occurredAt: now,
        });
      }

      return {
        userId: identity.userId,
        role: identity.role,
        sessionClass: spec.sessionClass,
        primaryAuthMethod: spec.primaryAuthMethod,
        strongAuthMethod: spec.strongAuthMethod,
        strongAuthAt: spec.strongAuthAt,
        token,
      };
    },

    async resolve(token: string, now: Date): Promise<AuthSession | null> {
      if (!isValidTokenFormat(token)) {
        return null;
      }

      const sessionId = hashSessionToken(token);

      const cached = sessionCache.get(sessionId, now);
      if (cached) {
        return {
          id: sessionId,
          userId: cached.userId,
          branchId: cached.branchId,
          role: cached.role,
          sessionClass: cached.sessionClass,
          primaryAuthMethod: cached.primaryAuthMethod,
          strongAuthMethod: cached.strongAuthMethod,
          strongAuthAt: cached.strongAuthAt,
          impersonatorUserId: cached.impersonatorUserId,
        };
      }

      const dbSession = await deps.sessions.findById(sessionId);
      if (!dbSession) {
        return null;
      }

      if (!isRole(dbSession.role)) {
        await revokeSession(sessionId);
        return null;
      }
      if (!isSessionClass(dbSession.session_class)) {
        await revokeSession(sessionId);
        return null;
      }
      if (!isPrimaryAuthMethod(dbSession.primary_auth_method)) {
        await revokeSession(sessionId);
        return null;
      }
      if (
        dbSession.strong_auth_method !== null &&
        !isStrongAuthMethod(dbSession.strong_auth_method)
      ) {
        await revokeSession(sessionId);
        return null;
      }
      if (dbSession.expires_at < now) {
        await revokeSession(sessionId);
        return null;
      }

      const user = await deps.users.findById(dbSession.user_id);
      if (!user || !user.is_active) {
        await revokeSession(sessionId);
        return null;
      }
      if (user.expires_at !== null && user.expires_at <= now) {
        await deps.users.deactivateIfExpired(user.id, now);
        await revokeUserSessions(user.id);
        return null;
      }

      if (
        now.getTime() - dbSession.last_activity.getTime() >
        ACTIVITY_UPDATE_THRESHOLD
      ) {
        deps.sessions.updateActivity(sessionId, now).catch((error: unknown) => {
          logger.error("update_activity_failed", { sessionId, error });
        });
      }

      if (
        dbSession.expires_at.getTime() - now.getTime() <
        EXTENSION_THRESHOLD
      ) {
        const newExpiry = addMilliseconds(now, SESSION_DURATION);
        deps.sessions
          .extendExpiry(sessionId, newExpiry)
          .catch((error: unknown) => {
            logger.error("extend_expiry_failed", { sessionId, error });
          });
        dbSession.expires_at = newExpiry;
      }

      const authSession = mapUserSessionRowToAuthSession(sessionId, dbSession);

      sessionCache.set(
        sessionId,
        {
          userId: authSession.userId,
          branchId: authSession.branchId,
          role: authSession.role,
          sessionClass: authSession.sessionClass,
          primaryAuthMethod: authSession.primaryAuthMethod,
          strongAuthMethod: authSession.strongAuthMethod,
          strongAuthAt: authSession.strongAuthAt,
          impersonatorUserId: authSession.impersonatorUserId,
          expiresAt: dbSession.expires_at,
        },
        now,
      );

      return authSession;
    },

    async revoke(sessionId: string): Promise<void> {
      await revokeSession(sessionId);
    },

    async revokeAllForUser(userId: UserId): Promise<void> {
      await revokeUserSessions(userId);
    },

    async revokeOtherForUser(
      userId: UserId,
      retainedSessionId: string,
    ): Promise<void> {
      await deps.sessions.deleteOtherForUser(userId, retainedSessionId);
      sessionCache.deleteByUserIdExcept(userId, retainedSessionId);
    },
  };
}

export type SessionService = ReturnType<typeof createSessionService>;
