import { buildThrottleKeys } from "~/server/auth/password/throttle-keys";
import type { AuthThrottleEndpoint } from "~/server/auth/password/throttle-policy";
import type { AuthThrottleScope } from "~/server/auth/repos-auth-throttle";

import { createAuthScenario } from "./scenario";

type AuthScenario = ReturnType<typeof createAuthScenario>;

export function createAuthThrottleKit(scenario: AuthScenario) {
  return {
    async seedCounter(params: {
      endpoint: AuthThrottleEndpoint;
      scope: AuthThrottleScope;
      identifier: string;
      ipAddress: string;
      failureCount: number;
      blockedUntil: Date | null;
      windowStartedAt?: Date;
      updatedAt?: Date;
    }): Promise<void> {
      const now = new Date();
      const keys = buildThrottleKeys(
        params.endpoint,
        params.identifier,
        params.ipAddress,
      );
      await scenario.ctx.repos.authThrottle.upsert({
        scope: params.scope,
        key_hash: keys[params.scope],
        window_started_at: params.windowStartedAt ?? now,
        failure_count: params.failureCount,
        blocked_until: params.blockedUntil,
        updated_at: params.updatedAt ?? now,
      });
    },

    async readCounter(params: {
      endpoint: AuthThrottleEndpoint;
      scope: AuthThrottleScope;
      identifier: string;
      ipAddress: string;
    }) {
      const keys = buildThrottleKeys(
        params.endpoint,
        params.identifier,
        params.ipAddress,
      );
      return scenario.ctx.repos.authThrottle.findByScopeAndKey(
        params.scope,
        keys[params.scope],
      );
    },
  };
}
