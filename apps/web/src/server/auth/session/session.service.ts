import { auditEntityId } from "~/domain/audit/entity";
import { isRole } from "~/domain/auth/access/rbac";
import {
  isPrimaryAuthMethod,
  isSessionClass,
  isStrongAuthMethod,
} from "~/domain/auth/core/session-contract";
import type { DomainError } from "~/domain/errors";
import { addMilliseconds } from "~/domain/time/clock";
import {
  mapUserSessionRowToAuthSession,
  mapUserToSessionIdentity,
} from "~/server/auth/session/session-mappers";
import {
  generateSessionToken,
  hashSessionToken,
  isValidTokenFormat,
} from "~/server/auth/session/tokens";
import type { OperationContext } from "~/server/platform/operation/context";
import { Ok, type Result } from "~/shared/result";

import type {
  AuthSession,
  AuditedSessionIssuerDeps,
  AuditedSessionSpec,
  IssuedSession,
  SessionAuthenticatorDeps,
  SessionIssuerDeps,
  SessionSpec,
} from "./session-spec";

const SESSION_DURATION = 30 * 24 * 60 * 60 * 1000;
const ACTIVITY_UPDATE_THRESHOLD = 5 * 60 * 1000;
const EXTENSION_THRESHOLD = 7 * 24 * 60 * 60 * 1000;

const noopLogger = {
  error() {},
};

export function createSessionAuthenticator(deps: SessionAuthenticatorDeps) {
  const logger = deps.logger ?? noopLogger;

  return {
    async resolve(
      token: string,
      operation: OperationContext,
    ): Promise<AuthSession | null> {
      if (!isValidTokenFormat(token)) {
        return null;
      }

      const sessionId = hashSessionToken(token);
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

      if (dbSession.expires_at < operation.operationAt) {
        await deps.sessions.delete(sessionId);
        return null;
      }

      const user = await deps.users.findById(dbSession.user_id);

      if (!user || !user.is_active) {
        await deps.sessions.delete(sessionId);
        return null;
      }

      if (
        user.expires_at !== null &&
        user.expires_at <= operation.operationAt
      ) {
        return null;
      }

      if (
        operation.operationAt.getTime() - dbSession.last_activity.getTime() >
        ACTIVITY_UPDATE_THRESHOLD
      ) {
        deps.sessions
          .updateActivity(sessionId, operation.operationAt)
          .catch((error: unknown) => {
            logger.error("update_activity_failed", { sessionId, error });
          });
      }

      if (
        dbSession.expires_at.getTime() - operation.operationAt.getTime() <
        EXTENSION_THRESHOLD
      ) {
        const newExpiry = addMilliseconds(
          operation.operationAt,
          SESSION_DURATION,
        );

        deps.sessions
          .extendExpiry(sessionId, newExpiry)
          .catch((error: unknown) => {
            logger.error("extend_expiry_failed", { sessionId, error });
          });

        dbSession.expires_at = newExpiry;
      }

      return mapUserSessionRowToAuthSession(sessionId, dbSession);
    },

    async revoke(sessionId: string): Promise<void> {
      await deps.sessions.delete(sessionId);
    },
  };
}

export type SessionAuthenticator = ReturnType<
  typeof createSessionAuthenticator
>;

export function createSessionIssuer(deps: SessionIssuerDeps) {
  return {
    async establish(
      spec: SessionSpec,
      operation: OperationContext,
    ): Promise<Result<IssuedSession, DomainError>> {
      const identity = mapUserToSessionIdentity(spec.user);
      const token = generateSessionToken();
      const sessionId = hashSessionToken(token);
      const expiresAt = addMilliseconds(
        operation.operationAt,
        SESSION_DURATION,
      );

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
        created_at: operation.operationAt,
        last_activity: operation.operationAt,
        expires_at: expiresAt,
      });

      return Ok({
        userId: identity.userId,
        role: identity.role,
        sessionClass: spec.sessionClass,
        primaryAuthMethod: spec.primaryAuthMethod,
        strongAuthMethod: spec.strongAuthMethod,
        strongAuthAt: spec.strongAuthAt,
        token,
      });
    },
  };
}

export type SessionIssuer = ReturnType<typeof createSessionIssuer>;

export function createAuditedSessionIssuer(deps: AuditedSessionIssuerDeps) {
  const issuer = createSessionIssuer(deps);

  return {
    async establish(
      spec: AuditedSessionSpec,
      operation: OperationContext,
    ): Promise<Result<IssuedSession, DomainError>> {
      const issued = await issuer.establish(spec, operation);

      if (!issued.ok) {
        return issued;
      }

      await deps.events.append({
        type: spec.auditAction,
        entityType: "user",
        entityId: auditEntityId("user", spec.user.id),
        actorUserId: spec.user.id,
        occurredAt: operation.operationAt,
      });

      return issued;
    },
  };
}
