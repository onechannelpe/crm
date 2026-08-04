import { operationAt } from "@tests/support/operation";
import type { TestDbContext } from "@tests/support/runtime/db";

import type { UserId } from "~/domain/ids";
import {
  createActionRateLimiter,
  type RateLimitedAction,
} from "~/server/security/action-rate-limit";

export const ACTION_RATE_LIMIT_POLICY = {
  "leads.request": { userLimit: 10, sourceIpLimit: 50, windowMs: 60_000 },
  "team.invite.create": {
    userLimit: 10,
    sourceIpLimit: 30,
    windowMs: 60 * 60_000,
  },
} as const;

export function checkActionRateLimit(
  actionName: RateLimitedAction,
  userId: UserId,
  context: Pick<TestDbContext, "db">,
  operation: Parameters<
    ReturnType<typeof createActionRateLimiter>["enforce"]
  >[2],
  ipAddress: string,
) {
  return createActionRateLimiter(context.db).enforce(
    actionName,
    userId,
    operation,
    ipAddress,
  );
}

export function createSecurityTestKit(ctx: TestDbContext) {
  return {
    async consumeUserLimit(
      actionName: keyof typeof ACTION_RATE_LIMIT_POLICY,
      userId: UserId,
      ipAddress: string,
      now: Date = new Date(),
    ) {
      const { userLimit } = ACTION_RATE_LIMIT_POLICY[actionName];
      for (let index = 0; index < userLimit; index += 1) {
        await checkActionRateLimit(
          actionName,
          userId,
          ctx,
          operationAt(now),
          ipAddress,
        );
      }
    },
    async consumeIpLimit(
      actionName: keyof typeof ACTION_RATE_LIMIT_POLICY,
      ipAddress: string,
      now: Date = new Date(),
    ) {
      const { sourceIpLimit } = ACTION_RATE_LIMIT_POLICY[actionName];
      const userIds = [
        ctx.fixtures.users.execOne.id,
        ctx.fixtures.users.backOne.id,
        ctx.fixtures.users.execTwo.id,
        ctx.fixtures.users.backTwo.id,
        ctx.fixtures.users.superUser.id,
      ];
      for (let index = 0; index < sourceIpLimit; index += 1) {
        await checkActionRateLimit(
          actionName,
          userIds[index % userIds.length],
          ctx,
          operationAt(now),
          ipAddress,
        );
      }
    },
  };
}
