import { config } from "~/lib/config";
import { repos } from "~/server/shared/context";

import { sessionCache } from "./session-cache";

export async function cleanupExpiredSessions(): Promise<void> {
  const deleted = await repos.sessions.deleteExpired();
  if (deleted > 0) {
    console.log(`[Session cleanup] Deleted ${deleted} expired sessions`);
  }
}

export async function cleanupExpiredWebauthnChallenges(): Promise<void> {
  const deleted = await repos.webauthnChallenges.deleteExpired();
  if (deleted > 0) {
    console.log(
      `[Auth cleanup] Deleted ${deleted} expired WebAuthn challenges`,
    );
  }
}

export async function cleanupStaleAuthThrottle(): Promise<void> {
  const expiredBlocks = await repos.authThrottle.deleteExpiredBlocks();
  const stale = await repos.authThrottle.deleteUpdatedBefore(
    Date.now() - config.auth.throttleRetentionMs,
  );
  const total = expiredBlocks + stale;
  if (total > 0) {
    console.log(`[Auth cleanup] Deleted ${total} stale throttle counters`);
  }
}

export async function cleanupStaleAuthEvents(): Promise<void> {
  const deleted = await repos.authEvents.deleteCreatedBefore(
    Date.now() - config.auth.eventsRetentionMs,
  );
  if (deleted > 0) {
    console.log(`[Auth cleanup] Deleted ${deleted} old auth events`);
  }
}

export async function cleanupStaleActionObservations(): Promise<void> {
  const deleted = await repos.actionObservations.deleteCreatedBefore(
    Date.now() - config.observability.retentionMs,
  );
  if (deleted > 0) {
    console.log(
      `[Observability cleanup] Deleted ${deleted} old action observations`,
    );
  }
}

export function getCacheStats() {
  return sessionCache.getStats();
}

if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      cleanupExpiredSessions().catch(console.error);
      cleanupExpiredWebauthnChallenges().catch(console.error);
      cleanupStaleAuthThrottle().catch(console.error);
      cleanupStaleAuthEvents().catch(console.error);
      cleanupStaleActionObservations().catch(console.error);
    },
    60 * 60 * 1000,
  );

  console.log("[Session cleanup] Scheduled to run every hour");
}
