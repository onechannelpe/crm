import { getRequestEvent } from "solid-js/web";

import { getClientIp } from "~/lib/auth/password/client-ip";
import { hashAuthKey } from "~/lib/auth/password/key-hash";
import type { ActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";
import { auditEntityId } from "~/server/shared/audit-entity";
import { rateLimited, throwDomain } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import type { EventsRepo } from "~/server/shared/repos-events";

interface ActionRateLimitPolicy {
  userLimit: number;
  sourceIpLimit: number;
  windowMs: number;
}

export const ACTION_RATE_LIMIT_POLICY = {
  "leads.request": { userLimit: 10, sourceIpLimit: 50, windowMs: 60_000 },
  "search.use": { userLimit: 120, sourceIpLimit: 300, windowMs: 60_000 },
  "capacity.request": { userLimit: 20, sourceIpLimit: 60, windowMs: 60_000 },
  "capacity.approve": { userLimit: 60, sourceIpLimit: 180, windowMs: 60_000 },
  "team.invite.create": {
    userLimit: 10,
    sourceIpLimit: 30,
    windowMs: 60 * 60_000,
  },
} satisfies Record<string, ActionRateLimitPolicy>;

export type RateLimitedAction = keyof typeof ACTION_RATE_LIMIT_POLICY;

export type RateLimitDeps = {
  actionRateLimits: ActionRateLimitsRepo;
  events: Pick<EventsRepo, "append">;
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

function buildUserKey(actionName: string, userId: UserId): string {
  return hashAuthKey(`action:${actionName}:user:${userId}`);
}

function buildIpKey(actionName: string, ip: string): string {
  return hashAuthKey(`action:${actionName}:ip:${ip}`);
}

async function blockWithAudit(params: {
  actionName: RateLimitedAction;
  userId: UserId;
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

  await deps.events.append({
    type: "rate_limit_exceeded",
    entityType: "user",
    entityId: auditEntityId("user", userId),
    actorUserId: userId,
    payload: { actionName, scope, limit, windowMs, retryAfterMs },
    occurredAt: new Date(now),
  });

  throwDomain(
    rateLimited(retryAfterSeconds, {
      code: "action_rate_limited",
    }),
  );
}

export async function checkActionRateLimit(
  actionName: RateLimitedAction,
  userId: UserId,
  deps: RateLimitDeps,
  ip: string = resolveRequestIp(),
): Promise<void> {
  const policy = ACTION_RATE_LIMIT_POLICY[actionName];
  const now = Date.now();

  // Check the per-user counter first. If the user is already over limit, skip
  // the shared IP counter entirely. Incrementing it for a blocked user would
  // consume IP budget and could deny legitimate users on the same NAT/proxy.
  const userSnapshot = await deps.actionRateLimits.checkAndIncrement(
    buildUserKey(actionName, userId),
    now,
    policy.windowMs,
  );

  if (userSnapshot.request_count > policy.userLimit) {
    await blockWithAudit({
      actionName,
      userId,
      scope: "user",
      limit: policy.userLimit,
      windowMs: policy.windowMs,
      windowStartedAt: userSnapshot.window_started_at,
      now,
      deps,
    });
  }

  // User is within the limit, now check the shared IP counter.
  const ipSnapshot = await deps.actionRateLimits.checkAndIncrement(
    buildIpKey(actionName, ip),
    now,
    policy.windowMs,
  );

  if (ipSnapshot.request_count > policy.sourceIpLimit) {
    await blockWithAudit({
      actionName,
      userId,
      scope: "ip",
      limit: policy.sourceIpLimit,
      windowMs: policy.windowMs,
      windowStartedAt: ipSnapshot.window_started_at,
      now,
      deps,
    });
  }
}
