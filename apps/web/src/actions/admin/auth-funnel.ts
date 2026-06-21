"use server";

import type { AuthFunnelSnapshot } from "~/contracts/observability/auth-funnel";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";

export async function getAuthFunnelSnapshot(
  rawParams?: unknown,
): Promise<AuthFunnelSnapshot> {
  return runAction({
    name: "admin.auth_funnel.snapshot.read",
    access: { kind: "permission", permission: "audit:read" },

    parse: () => {
      if (rawParams === undefined || rawParams === null) {
        return Ok({});
      }

      return parseObject(rawParams, validationFail, (r) => ({
        windowMinutes: r.optNum("windowMinutes") ?? undefined,
        limit: r.optNum("limit") ?? undefined,
        eventName: r.optStr("eventName") ?? undefined,
        method: r.optStr("method") ?? undefined,
        outcome: r.optStr("outcome") ?? undefined,
      }));
    },

    execute: (_ctx, input) =>
      getServerRuntime().observability.observabilityService.getAuthFunnelSnapshot(
        input,
      ),
  });
}
