import { getRequestEvent } from "solid-js/web";

import { rateLimitError } from "~/lib/app-errors";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { hashAuthKey } from "~/lib/auth/password/key-hash";
import type { NewAuditLog } from "~/lib/db/schema";
import type { ActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";

interface ActionRateLimitPolicy {
  /** Max requests per authenticated user per window. */
  limit: number;
  /** Max requests from a single source IP per window (guards against credential-stuffing / shared-IP flooding). */
  ipLimit: number;
  windowMs: number;
}

export const ACTION_RATE_LIMIT_POLICY = {
  "leads.request":              { limit: 10, ipLimit: 50,  windowMs: 60_000 },
  "sales_records.create_draft": { limit: 20, ipLimit: 100, windowMs: 60_000 },
  "sales_records.submit":       { limit: 30, ipLimit: 150, windowMs: 60_000 },
  "quota.allocate":             { limit: 5,  ipLimit: 25,  windowMs: 60_000 },
  "team.invite.create":         { limit: 10, ipLimit: 30,  windowMs: 60 * 60_000 },
} satisfies Record<string, ActionRateLimitPolicy>;

export type RateLimitedAction = keyof typeof ACTION_RATE_LIMIT_POLICY;

export type RateLimitDeps = {
  actionRateLimits: ActionRateLimitsRepo;
  auditLogs: {
    create(values: NewAuditLog): unknown;
  };
};

function resolveRequestIp(): string {
  const event = getRequestEvent();
  if (!event?.request) {
    throw new Error(
      "[RateLimit] checkActionRateLimit called outside a request context; pass ip explicitly",
    );
  }
  return getClientIp(event.request.headers);
}

function buildUserKey(actionName: string, userId: number): string {
  return hashAuthKey(`action:${actionName}:user:${userId}`);
}

function buildIpKey(actionName: string, ip: string): string {
  return hashAuthKey(`action:${actionName}:ip:${ip}`);
}

export async function checkActionRateLimit(
  actionName: RateLimitedAction,
  userId: number,
  deps: RateLimitDeps,
  ip: string = resolveRequestIp(),
): Promise<void> {
  const policy = ACTION_RATE_LIMIT_POLICY[actionName];
  const now = Date.now();

  const [userSnapshot, ipSnapshot] = await Promise.all([
    deps.actionRateLimits.checkAndIncrement(buildUserKey(actionName, userId), now, policy.windowMs),
    deps.actionRateLimits.checkAndIncrement(buildIpKey(actionName, ip), now, policy.windowMs),
  ]);

  const scope: "user" | "ip" | null =
    userSnapshot.request_count > policy.limit ? "user"
    : ipSnapshot.request_count > policy.ipLimit ? "ip"
    : null;

  if (scope !== null) {
    const snapshot = scope === "user" ? userSnapshot : ipSnapshot;
    const retryAfterMs = policy.windowMs - (now - snapshot.window_started_at);
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

    await deps.auditLogs.create({
      user_id: userId,
      action: "rate_limit_exceeded",
      entity_type: "user",
      entity_id: userId,
      changes: JSON.stringify({
        actionName,
        scope,
        limit: scope === "user" ? policy.limit : policy.ipLimit,
        windowMs: policy.windowMs,
        retryAfterMs,
      }),
      created_at: now,
    });

    throw rateLimitError(
      `Too many requests for ${actionName}. Try again in ${retryAfterSeconds}s.`,
      retryAfterSeconds,
    );
  }
}
