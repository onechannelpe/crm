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

function buildKey(actionName: string, userId: number, ip: string): string {
  return hashAuthKey(`action:${actionName}:user:${userId}:ip:${ip}`);
}

/**
 * Enforces a fixed-window rate limit for the given action and caller.
 * Throws a 429 Response with Retry-After on violation, after writing an
 * audit log entry. No-ops when policy is not satisfied yet.
 */
export async function checkActionRateLimit(
  actionName: RateLimitedAction,
  userId: number,
  ip: string,
  deps: RateLimitDeps,
): Promise<void> {
  const policy = ACTION_RATE_LIMIT_POLICY[actionName];
  const now = Date.now();
  const keyHash = buildKey(actionName, userId, ip);

  const counter = await deps.actionRateLimits.findByKey(keyHash);

  if (counter !== null && now - counter.window_started_at < policy.windowMs) {
    if (counter.request_count >= policy.limit) {
      const retryAfterMs = policy.windowMs - (now - counter.window_started_at);
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

    await deps.actionRateLimits.increment(keyHash, now);
  } else {
    await deps.actionRateLimits.upsert({
      key_hash: keyHash,
      window_started_at: now,
      request_count: 1,
      updated_at: now,
    });
  }
}
