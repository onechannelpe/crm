"use server";

import type {
  AuthFunnelSnapshot,
  AuthFunnelSnapshotInput,
} from "~/contracts/observability/auth-funnel";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok, type Result } from "~/server/shared/result";

function parseAuthFunnelInput(
  raw: unknown,
): Result<AuthFunnelSnapshotInput, DomainError> {
  if (raw === undefined || raw === null) return Ok({});
  return parseObject(raw, validationFail, (r) => ({
    windowMinutes: r.optNum("windowMinutes") ?? undefined,
    limit: r.optNum("limit") ?? undefined,
    eventName: r.optStr("eventName") ?? undefined,
    method: r.optStr("method") ?? undefined,
    outcome: r.optStr("outcome") ?? undefined,
  }));
}

export async function getAuthFunnelSnapshot(
  rawParams?: unknown,
): Promise<AuthFunnelSnapshot> {
  return runAction({
    name: "admin.auth_funnel.snapshot.read",
    access: { kind: "permission", permission: "audit:read" },
    parse: () => parseAuthFunnelInput(rawParams),

    execute: (_ctx, input) =>
      getServerRuntime().observability.observabilityService.getAuthFunnelSnapshot(
        input,
      ),
  });
}
