import { getRequestEvent } from "solid-js/web";

import { rateLimitError } from "~/lib/app-errors";
import { getClientIp } from "~/lib/auth/password/client-ip";
import { hashAuthKey } from "~/lib/auth/password/key-hash";
import type { NewAuditLog } from "~/lib/db/types";
import type { ActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";

interface ActionRateLimitPolicy {
  /** Max requests per authenticated user per window. */
  limit: number;
  /** Max requests from a single source IP per window (guards against credential-stuffing / shared-IP flooding). */
  ipLimit: number;
  windowMs: number;
}

export const ACTION_RATE_LIMIT_POLICY = {
  "leads.request": { limit: 10, ipLimit: 50, windowMs: 60_000 },
  "sales_records.create_draft": { limit: 20, ipLimit: 100, windowMs: 60_000 },
  "sales_records.submit": { limit: 30, ipLimit: 150, windowMs: 60_000 },
  "team.invite.create": { limit: 10, ipLimit: 30, windowMs: 60 * 60_000 },
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

async function blockWithAudit(params: {
  actionName: RateLimitedAction;
  userId: number;
  scope: "user" | "ip";
  limit: number;
  windowMs: number;
  windowStartedAt: number;
  now: number;
  deps: RateLimitDeps;
}): Promise<never> {
  const {
    actionName,
    userId,
    scope,
    limit,
    windowMs,
    windowStartedAt,
    now,
    deps,
  } = params;
  const retryAfterMs = windowMs - (now - windowStartedAt);
  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

  // RFC 6585 §4: 429 responses must carry Retry-After when the reset time is known.
  // event.response is the outgoing response headers for the current server request.
  getRequestEvent()?.response.headers.set(
    "Retry-After",
    String(retryAfterSeconds),
  );

  await deps.auditLogs.create({
    user_id: userId,
    action: "rate_limit_exceeded",
    entity_type: "user",
    entity_id: userId,
    changes: JSON.stringify({
      actionName,
      scope,
      limit,
      windowMs,
      retryAfterMs,
    }),
    created_at: now,
  });

  throw rateLimitError(
    `Too many requests for ${actionName}. Try again in ${retryAfterSeconds}s.`,
    retryAfterSeconds,
  );
}

export async function checkActionRateLimit(
  actionName: RateLimitedAction,
  userId: number,
  deps: RateLimitDeps,
  ip: string = resolveRequestIp(),
): Promise<void> {
  const policy = ACTION_RATE_LIMIT_POLICY[actionName];
  const now = Date.now();

  // Check the per-user counter first. If the user is already over limit, skip
  // the shared IP counter entirely — incrementing it for a blocked user would
  // consume IP budget and could deny legitimate users on the same NAT/proxy.
  const userSnapshot = await deps.actionRateLimits.checkAndIncrement(
    buildUserKey(actionName, userId),
    now,
    policy.windowMs,
  );

  if (userSnapshot.request_count > policy.limit) {
    await blockWithAudit({
      actionName,
      userId,
      scope: "user",
      limit: policy.limit,
      windowMs: policy.windowMs,
      windowStartedAt: userSnapshot.window_started_at,
      now,
      deps,
    });
  }

  // User is within limit — now evaluate the shared IP counter.
  const ipSnapshot = await deps.actionRateLimits.checkAndIncrement(
    buildIpKey(actionName, ip),
    now,
    policy.windowMs,
  );

  if (ipSnapshot.request_count > policy.ipLimit) {
    await blockWithAudit({
      actionName,
      userId,
      scope: "ip",
      limit: policy.ipLimit,
      windowMs: policy.windowMs,
      windowStartedAt: ipSnapshot.window_started_at,
      now,
      deps,
    });
  }
}
