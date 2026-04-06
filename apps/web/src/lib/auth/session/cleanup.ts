import { config } from "~/lib/config";
import { db } from "~/lib/db/db";
import { createLogger } from "~/lib/observability/logger";
import { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { createAuthFunnelEventsRepo } from "~/server/observability/repos-auth-funnel-events";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { createRequestSessionsRepo } from "~/server/security/repos-request-sessions";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";

import { sessionCache } from "./session-cache";

const logger = createLogger("session-cleanup");
const repos = {
  sessions: createSessionRepository(db),
  requestSessions: createRequestSessionsRepo(db),
  webauthnChallenges: createWebauthnChallengesRepo(db),
  authThrottle: createAuthThrottleRepo(db),
  authEvents: createAuthEventsRepo(db),
  actionObservations: createActionObservationsRepo(db),
  authFunnelEvents: createAuthFunnelEventsRepo(db),
  actionRateLimits: createActionRateLimitsRepo(db),
};

export async function cleanupExpiredSessions(): Promise<void> {
  const deleted = await repos.sessions.deleteExpired();
  if (deleted > 0) {
    logger.info("expired_sessions_deleted", { deleted });
  }
}

export async function cleanupExpiredRequestSessions(): Promise<void> {
  const deleted = await repos.requestSessions.deleteExpired();
  if (deleted > 0) {
    logger.info("expired_request_sessions_deleted", { deleted });
  }
}

export async function cleanupExpiredWebauthnChallenges(): Promise<void> {
  const deleted = await repos.webauthnChallenges.deleteExpired();
  if (deleted > 0) {
    logger.info("expired_webauthn_challenges_deleted", { deleted });
  }
}

export async function cleanupStaleAuthThrottle(): Promise<void> {
  const expiredBlocks = await repos.authThrottle.deleteExpiredBlocks();
  const stale = await repos.authThrottle.deleteUpdatedBefore(
    Date.now() - config.auth.throttleRetentionMs,
  );
  const total = expiredBlocks + stale;
  if (total > 0) {
    logger.info("stale_auth_throttle_deleted", { total });
  }
}

export async function cleanupStaleAuthEvents(): Promise<void> {
  const deleted = await repos.authEvents.deleteCreatedBefore(
    Date.now() - config.auth.eventsRetentionMs,
  );
  if (deleted > 0) {
    logger.info("stale_auth_events_deleted", { deleted });
  }
}

export async function cleanupStaleActionObservations(): Promise<void> {
  const deleted = await repos.actionObservations.deleteCreatedBefore(
    Date.now() - config.observability.retentionMs,
  );
  if (deleted > 0) {
    logger.info("stale_action_observations_deleted", { deleted });
  }
}

export async function cleanupStaleAuthFunnelEvents(): Promise<void> {
  const deleted = await repos.authFunnelEvents.deleteCreatedBefore(
    Date.now() - config.observability.retentionMs,
  );
  if (deleted > 0) {
    logger.info("stale_auth_funnel_events_deleted", { deleted });
  }
}

export async function cleanupStaleActionRateLimits(): Promise<void> {
  const deleted = await repos.actionRateLimits.deleteUpdatedBefore(
    Date.now() - config.security.rateLimitRetentionMs,
  );
  if (deleted > 0) {
    logger.info("stale_rate_limit_counters_deleted", { deleted });
  }
}

export function getCacheStats() {
  return sessionCache.getStats();
}

export function startSessionCleanupScheduler(intervalMs = 60 * 60 * 1000) {
  if (typeof setInterval === "undefined") return;
  setInterval(() => {
    cleanupExpiredSessions().catch((error: unknown) => {
      logger.error("expired_sessions_cleanup_failed", { error });
    });
    cleanupExpiredRequestSessions().catch((error: unknown) => {
      logger.error("expired_request_sessions_cleanup_failed", { error });
    });
    cleanupExpiredWebauthnChallenges().catch((error: unknown) => {
      logger.error("webauthn_challenges_cleanup_failed", { error });
    });
    cleanupStaleAuthThrottle().catch((error: unknown) => {
      logger.error("auth_throttle_cleanup_failed", { error });
    });
    cleanupStaleAuthEvents().catch((error: unknown) => {
      logger.error("auth_events_cleanup_failed", { error });
    });
    cleanupStaleActionObservations().catch((error: unknown) => {
      logger.error("action_observations_cleanup_failed", { error });
    });
    cleanupStaleAuthFunnelEvents().catch((error: unknown) => {
      logger.error("auth_funnel_events_cleanup_failed", { error });
    });
    cleanupStaleActionRateLimits().catch((error: unknown) => {
      logger.error("action_rate_limits_cleanup_failed", { error });
    });
  }, intervalMs);
  logger.info("cleanup_scheduler_started", {
    intervalSeconds: Math.round(intervalMs / 1000),
  });
}
