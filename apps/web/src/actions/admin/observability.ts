"use server";

import type {
  ObservabilitySnapshot,
  ObservabilitySnapshotInput,
} from "~/contracts/observability/snapshot";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";

export async function getObservabilitySnapshot(
  rawParams?: unknown,
): Promise<ObservabilitySnapshot> {
  return runAction({
    name: "admin.observability.snapshot.read",
    access: { kind: "permission", permission: "audit:read" },

    parse: () => {
      if (rawParams === undefined || rawParams === null) {
        return Ok({});
      }

      return parseObject(rawParams, validationFail, (r) => ({
        windowMinutes: r.optNum("windowMinutes") ?? undefined,
        limit: r.optNum("limit") ?? undefined,
        status: r.optStr("status") ?? undefined,
        actionName: r.optStr("actionName") ?? undefined,
      }));
    },

    execute: (_ctx, input: ObservabilitySnapshotInput) =>
      getServerRuntime().observability.observabilityService.getActionSnapshot(
        input,
      ),
  });
}
