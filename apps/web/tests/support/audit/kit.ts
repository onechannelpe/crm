import type { TestDbContext } from "@tests/support/runtime/db";

import { createObservabilityService } from "~/server/observability/service";

import type { ActionObservationSeed } from "./builders";

export function createAuditTestKit(ctx: TestDbContext) {
  const observability = createObservabilityService({
    actionObservations: ctx.repos.actionObservations,
    authFunnelEvents: ctx.repos.authFunnelEvents,
  });

  return {
    observability,

    async recordAction(seed: ActionObservationSeed): Promise<void> {
      await observability.recordAction({
        traceId: seed.traceId,
        requestId: seed.requestId,
        routePath: seed.routePath,
        httpMethod: "POST",
        actionName: seed.actionName,
        actorUserId: seed.actorUserId,
        actorRole: seed.actorRole,
        status: seed.status,
        durationMs: seed.durationMs,
        errorCode: seed.errorCode ?? null,
        errorMessage: seed.errorMessage ?? null,
        input: seed.input ?? {},
        createdAt: seed.createdAt,
      });
    },
  };
}
