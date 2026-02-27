import { getRequestEvent } from "solid-js/web";

import { getClientIp } from "~/lib/auth/password/client-ip";
import { hashAuthKey } from "~/lib/auth/password/key-hash";
import type { NewAuditLog } from "~/lib/db/schema";
import type { ActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";

interface ActionRateLimitPolicy {
  limit: number;
  windowMs: number;
}

// Centralized policy. Changing limits here affects all enforcement points.
export const ACTION_RATE_LIMIT_POLICY = {
  "leads.request": { limit: 10, windowMs: 60_000 },
  "sales_records.create_draft": { limit: 20, windowMs: 60_000 },
  "sales_records.submit": { limit: 30, windowMs: 60_000 },
  "quota.allocate": { limit: 5, windowMs: 60_000 },
  "team.invite.create": { limit: 10, windowMs: 60 * 60_000 },
} satisfies Record<string, ActionRateLimitPolicy>;

export type RateLimitedAction = keyof typeof ACTION_RATE_LIMIT_POLICY;

type RateLimitDeps = {
  actionRateLimits: ActionRateLimitsRepo;
  auditLogs: {
    create(values: NewAuditLog): unknown;
  };
};

function resolveRequestIp(): string {
  const event = getRequestEvent();
  if (!event?.request) {
    console.warn("[RateLimit] getRequestEvent() returned no request; falling back to 127.0.0.1");
    return "127.0.0.1";
  }
  return getClientIp(event.request.headers);
}

function buildKey(actionName: string, userId: number, ip: string): string {
  return hashAuthKey(`action:${actionName}:user:${userId}:ip:${ip}`);
}

/**
 * Enforces a fixed-window rate limit for the given action and caller.
 *
 * Uses a single atomic INSERT … ON CONFLICT DO UPDATE … RETURNING to eliminate
 * the read-check-write race. The `ip` parameter defaults to the IP resolved from
 * the current SolidStart request context; tests can supply it explicitly.
 *
 * Throws a 429 Response with Retry-After on violation, after writing an audit
 * log entry.
 */
export async function checkActionRateLimit(
  actionName: RateLimitedAction,
  userId: number,
  deps: RateLimitDeps,
  ip: string = resolveRequestIp(),
): Promise<void> {
  const policy = ACTION_RATE_LIMIT_POLICY[actionName];
  const now = Date.now();
  const keyHash = buildKey(actionName, userId, ip);

  const { request_count, window_started_at } =
    await deps.actionRateLimits.checkAndIncrement(keyHash, now, policy.windowMs);

  if (request_count > policy.limit) {
    const retryAfterMs = policy.windowMs - (now - window_started_at);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    await deps.auditLogs.create({
      user_id: userId,
      action: "rate_limit_exceeded",
      entity_type: "user",
      entity_id: userId,
      changes: JSON.stringify({
        actionName,
        limit: policy.limit,
        windowMs: policy.windowMs,
        retryAfterMs,
      }),
      created_at: now,
    });

    throw new Response("Too many requests", {
      status: 429,
      headers: { "Retry-After": String(retryAfterSeconds) },
    });
  }
}
