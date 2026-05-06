import type { TestDbContext } from "@tests/support/runtime/db";

import {
  ACTION_RATE_LIMIT_POLICY,
  checkActionRateLimit,
} from "~/lib/security/action-rate-limit";

export function createSecurityTestKit(ctx: TestDbContext) {
  return {
    async consumeUserLimit(
      actionName: keyof typeof ACTION_RATE_LIMIT_POLICY,
      userId: number,
      ipAddress: string,
    ) {
      const { limit } = ACTION_RATE_LIMIT_POLICY[actionName];
      for (let index = 0; index < limit; index += 1) {
        await checkActionRateLimit(actionName, userId, ctx.repos, ipAddress);
      }
    },
    async consumeIpLimit(
      actionName: keyof typeof ACTION_RATE_LIMIT_POLICY,
      ipAddress: string,
    ) {
      const { ipLimit } = ACTION_RATE_LIMIT_POLICY[actionName];
      for (let index = 0; index < ipLimit; index += 1) {
        await checkActionRateLimit(
          actionName,
          (index % 5) + 1,
          ctx.repos,
          ipAddress,
        );
      }
    },
  };
}
