import { getRequestEvent } from "solid-js/web";

import { auditEntityId } from "~/domain/audit/entity";
import { rateLimited } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { getClientIp } from "~/server/auth/password/client-ip";
import { hashAuthKey } from "~/server/auth/password/key-hash";
import type { EventsRepo } from "~/server/event-logs/events-repo";
import { throwDomain } from "~/server/platform/action/domain-error";
import type { ActionRateLimitsRepo } from "~/server/security/repos-action-rate-limits";

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
  windowStartedAt: Date;
  now: Date;
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
  const retryAfterMs = windowMs - (now.getTime() - windowStartedAt.getTime());
  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

  // RFC 6585: a 429 must carry Retry-After when the reset is known.
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
    occurredAt: now,
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
  const now = new Date();

  // Skip the IP counter when the user is over their limit; incrementing it
  // would consume IP budget shared with legitimate users behind the same NAT.
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

  // IP counter runs only when the user is within their personal budget.
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
