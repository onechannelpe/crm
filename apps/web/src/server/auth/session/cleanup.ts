import { AUTH_MAINTENANCE_RETENTION } from "~/server/auth/config";
import { createAuthEventsRepo } from "~/server/auth/repos-auth-events";
import { createAuthThrottleRepo } from "~/server/auth/repos-auth-throttle";
import { createActionObservationsRepo } from "~/server/observability/repos-action-observations";
import { createAuthFunnelEventsRepo } from "~/server/observability/repos-auth-funnel-events";
import type { DatabaseExecutor } from "~/server/platform/database/executor";
import { createActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { createRequestSessionsRepo } from "~/server/security/repos-request-sessions";
import { createSessionRepository } from "~/server/sessions/repos-sessions";
import { createWebauthnChallengesRepo } from "~/server/users/repos-webauthn-challenges";
import { createLogger } from "~/shared/observability/runtime-logger";

const logger = createLogger("session-cleanup");
function createCleanupRepos(executor: DatabaseExecutor) {
  return {
    sessions: createSessionRepository(executor),
    requestSessions: createRequestSessionsRepo(executor),
    webauthnChallenges: createWebauthnChallengesRepo(executor),
    authThrottle: createAuthThrottleRepo(executor),
    authEvents: createAuthEventsRepo(executor),
    actionObservations: createActionObservationsRepo(executor),
    authFunnelEvents: createAuthFunnelEventsRepo(executor),
    actionRateLimits: createActionRateLimitsRepo(executor),
  };
}

async function cleanupExpiredSessions(
  executor: DatabaseExecutor,
): Promise<void> {
  const repos = createCleanupRepos(executor);
  const deleted = await repos.sessions.deleteExpired();
  if (deleted > 0) {
    logger.info("expired_sessions_deleted", { deleted });
  }
}

async function cleanupExpiredRequestSessions(
  executor: DatabaseExecutor,
): Promise<void> {
  const repos = createCleanupRepos(executor);
  const deleted = await repos.requestSessions.deleteExpired();
  if (deleted > 0) {
    logger.info("expired_request_sessions_deleted", { deleted });
  }
}

async function cleanupExpiredWebauthnChallenges(
  executor: DatabaseExecutor,
): Promise<void> {
  const repos = createCleanupRepos(executor);
  const deleted = await repos.webauthnChallenges.deleteExpired();
  if (deleted > 0) {
    logger.info("expired_webauthn_challenges_deleted", { deleted });
  }
}

async function cleanupStaleAuthThrottle(
  executor: DatabaseExecutor,
): Promise<void> {
  const repos = createCleanupRepos(executor);
  const expiredBlocks = await repos.authThrottle.deleteExpiredBlocks();
  const stale = await repos.authThrottle.deleteUpdatedBefore(
    new Date(Date.now() - AUTH_MAINTENANCE_RETENTION.throttleMs),
  );
  const total = expiredBlocks + stale;
  if (total > 0) {
    logger.info("stale_auth_throttle_deleted", { total });
  }
}

async function cleanupStaleAuthEvents(
  executor: DatabaseExecutor,
): Promise<void> {
  const repos = createCleanupRepos(executor);
  const deleted = await repos.authEvents.deleteCreatedBefore(
    new Date(Date.now() - AUTH_MAINTENANCE_RETENTION.eventsMs),
  );
  if (deleted > 0) {
    logger.info("stale_auth_events_deleted", { deleted });
  }
}

async function cleanupStaleActionObservations(
  executor: DatabaseExecutor,
): Promise<void> {
  const repos = createCleanupRepos(executor);
  const deleted = await repos.actionObservations.deleteCreatedBefore(
    new Date(Date.now() - AUTH_MAINTENANCE_RETENTION.observationsMs),
  );
  if (deleted > 0) {
    logger.info("stale_action_observations_deleted", { deleted });
  }
}

async function cleanupStaleAuthFunnelEvents(
  executor: DatabaseExecutor,
): Promise<void> {
  const repos = createCleanupRepos(executor);
  const deleted = await repos.authFunnelEvents.deleteCreatedBefore(
    new Date(Date.now() - AUTH_MAINTENANCE_RETENTION.observationsMs),
  );
  if (deleted > 0) {
    logger.info("stale_auth_funnel_events_deleted", { deleted });
  }
}

async function cleanupStaleActionRateLimits(
  executor: DatabaseExecutor,
): Promise<void> {
  const repos = createCleanupRepos(executor);
  const deleted = await repos.actionRateLimits.deleteUpdatedBefore(
    new Date(Date.now() - AUTH_MAINTENANCE_RETENTION.rateLimitsMs),
  );
  if (deleted > 0) {
    logger.info("stale_rate_limit_counters_deleted", { deleted });
  }
}

export function startSessionCleanupScheduler(
  executor: DatabaseExecutor,
  intervalMs = 60 * 60 * 1000,
): () => void {
  const timer = setInterval(() => {
    cleanupExpiredSessions(executor).catch((error: unknown) => {
      logger.error("expired_sessions_cleanup_failed", { error });
    });
    cleanupExpiredRequestSessions(executor).catch((error: unknown) => {
      logger.error("expired_request_sessions_cleanup_failed", { error });
    });
    cleanupExpiredWebauthnChallenges(executor).catch((error: unknown) => {
      logger.error("webauthn_challenges_cleanup_failed", { error });
    });
    cleanupStaleAuthThrottle(executor).catch((error: unknown) => {
      logger.error("auth_throttle_cleanup_failed", { error });
    });
    cleanupStaleAuthEvents(executor).catch((error: unknown) => {
      logger.error("auth_events_cleanup_failed", { error });
    });
    cleanupStaleActionObservations(executor).catch((error: unknown) => {
      logger.error("action_observations_cleanup_failed", { error });
    });
    cleanupStaleAuthFunnelEvents(executor).catch((error: unknown) => {
      logger.error("auth_funnel_events_cleanup_failed", { error });
    });
    cleanupStaleActionRateLimits(executor).catch((error: unknown) => {
      logger.error("action_rate_limits_cleanup_failed", { error });
    });
  }, intervalMs);
  logger.info("cleanup_scheduler_started", {
    intervalSeconds: Math.round(intervalMs / 1000),
  });

  return () => clearInterval(timer);
}
