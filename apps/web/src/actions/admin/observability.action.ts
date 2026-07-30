import type { ObservabilitySnapshot } from "~/contracts/observability/snapshot";
import { composeObservability } from "~/server/observability/ui/composition";
import { executeAdminServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { Ok } from "~/shared/result";

export async function getObservabilitySnapshot(
  rawParams?: unknown,
): Promise<ObservabilitySnapshot> {
  "use server";

  return executeAdminServerFunction({
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

    execute: (_ctx, input) =>
      composeObservability().observabilityService.getActionSnapshot(input),
  });
}
