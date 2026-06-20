"use server";

import type {
  ObservabilitySnapshot,
  ObservabilitySnapshotInput,
} from "~/contracts/observability/snapshot";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok, type Result } from "~/server/shared/result";

function parseObservabilityInput(
  raw: unknown,
): Result<ObservabilitySnapshotInput, DomainError> {
  if (raw === undefined || raw === null) return Ok({});
  return parseObject(raw, validationFail, (r) => ({
    windowMinutes: r.optNum("windowMinutes") ?? undefined,
    limit: r.optNum("limit") ?? undefined,
    status: r.optStr("status") ?? undefined,
    actionName: r.optStr("actionName") ?? undefined,
  }));
}

export async function getObservabilitySnapshot(
  rawParams?: unknown,
): Promise<ObservabilitySnapshot> {
  return runAction({
    name: "admin.observability.snapshot.read",
    access: { kind: "permission", permission: "audit:read" },
    parse: () => parseObservabilityInput(rawParams),

    execute: (_ctx, input) =>
      getServerRuntime().observability.observabilityService.getActionSnapshot(
        input,
      ),
  });
}
