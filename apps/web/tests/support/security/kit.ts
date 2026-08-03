import { operationAt } from "@tests/support/operation";
import type { TestDbContext } from "@tests/support/runtime/db";

import type { UserId } from "~/domain/ids";
import {
  ACTION_RATE_LIMIT_POLICY,
  checkActionRateLimit,
} from "~/server/security/action-rate-limit";

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
          ctx.repos,
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
          ctx.repos,
          operationAt(now),
          ipAddress,
        );
      }
    },
  };
}
