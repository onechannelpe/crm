import "server-only";
import type { ObservabilitySnapshot } from "~/contracts/observability/snapshot";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { Ok } from "~/shared/result";

export async function getObservabilitySnapshot(
  rawParams?: unknown,
): Promise<ObservabilitySnapshot> {
  return executeSessionServerFunction({
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

    execute: ({ operationAt: now }, input) =>
      application.observability.getActionSnapshot(input, now),
  });
}
