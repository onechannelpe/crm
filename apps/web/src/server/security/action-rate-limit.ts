import type { Kysely } from "kysely";

import { auditEntityId } from "~/domain/audit/entity";
import { rateLimited } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { hashAuthKey } from "~/server/auth/password/key-hash";
import {
  createEventsWriter,
  type EventsWriter,
} from "~/server/event-logs/events-repo";
import { throwDomain } from "~/server/platform/action/domain-error";
import type { Database } from "~/server/platform/database/types";
import type { OperationContext } from "~/server/platform/operation/context";
import {
  createActionRateLimitsRepo,
  type ActionRateLimitsRepo,
} from "~/server/security/repos-action-rate-limits";
import { createLogger } from "~/shared/observability/runtime-logger";

const logger = createLogger("action-rate-limit");

interface ActionRateLimitPolicy {
  userLimit: number;
  sourceIpLimit: number;
  windowMs: number;
}

// Exported so tests use the same limits as production.
export const ACTION_RATE_LIMIT_POLICY = Object.freeze({
  "leads.request": { userLimit: 10, sourceIpLimit: 50, windowMs: 60_000 },
  "search.use": { userLimit: 120, sourceIpLimit: 300, windowMs: 60_000 },
  "capacity.request": { userLimit: 20, sourceIpLimit: 60, windowMs: 60_000 },
  "capacity.approve": { userLimit: 60, sourceIpLimit: 180, windowMs: 60_000 },
  "capacity.reject": { userLimit: 60, sourceIpLimit: 180, windowMs: 60_000 },
  "team.invite.create": {
    userLimit: 10,
    sourceIpLimit: 30,
    windowMs: 60 * 60_000,
  },
} satisfies Record<string, ActionRateLimitPolicy>);

export type RateLimitedAction = keyof typeof ACTION_RATE_LIMIT_POLICY;

export interface ActionRateLimiter {
  enforce(
    actionName: RateLimitedAction,
    userId: UserId,
    operation: OperationContext,
    ip: string,
  ): Promise<void>;
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
  operation: OperationContext;
  events: Pick<EventsWriter, "append">;
}): Promise<never> {
  const {
    actionName,
    userId,
    scope,
    limit,
    windowMs,
    windowStartedAt,
    operation,
    events,
  } = params;

  const retryAfterMs =
    windowMs - (operation.operationAt.getTime() - windowStartedAt.getTime());

  const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));

  try {
    await events.append({
      type: "rate_limit_exceeded",
      entityType: "user",
      entityId: auditEntityId("user", userId),
      actorUserId: userId,
      payload: {
        actionName,
        scope,
        limit,
        windowMs,
        retryAfterMs,
      },
      occurredAt: operation.operationAt,
    });
  } catch (error: unknown) {
    logger.error("rate_limit_audit_failed", {
      actionName,
      scope,
      userId,
      error,
    });
  }

  throwDomain(
    rateLimited(retryAfterSeconds, {
      code: "action_rate_limited",
    }),
  );
}

async function checkActionRateLimit(
  actionName: RateLimitedAction,
  userId: UserId,
  rateLimits: ActionRateLimitsRepo,
  operation: OperationContext,
  events: Pick<EventsWriter, "append">,
  ip: string,
): Promise<void> {
  const policy = ACTION_RATE_LIMIT_POLICY[actionName];

  // Do not consume shared IP budget after the user has exceeded their own limit.
  const userSnapshot = await rateLimits.checkAndIncrement(
    buildUserKey(actionName, userId),
    operation.operationAt,
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
      operation,
      events,
    });
  }

  const ipSnapshot = await rateLimits.checkAndIncrement(
    buildIpKey(actionName, ip),
    operation.operationAt,
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
      operation,
      events,
    });
  }
}

export function createActionRateLimiter(
  db: Kysely<Database>,
): ActionRateLimiter {
  if (db.isTransaction) {
    throw new Error("action_rate_limiter_requires_root_database");
  }

  const rateLimits = createActionRateLimitsRepo(db);
  const events = {
    append: (input: Parameters<EventsWriter["append"]>[0]) =>
      db.transaction().execute((tx) => createEventsWriter(tx).append(input)),
  };

  return {
    enforce(actionName, userId, operation, ip) {
      return checkActionRateLimit(
        actionName,
        userId,
        rateLimits,
        operation,
        events,
        ip,
      );
    },
  };
}
