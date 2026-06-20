"use server";

import type {
  AuditReaderFilterInput,
  AuditReaderSnapshot,
} from "~/contracts/audit-reader/snapshot";
import { createAuditReaderService } from "~/server/audit-reader/service";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok, type Result } from "~/server/shared/result";

function parseAuditReaderFilter(
  raw: unknown,
): Result<AuditReaderFilterInput, DomainError> {
  if (raw === undefined || raw === null) return Ok({});
  return parseObject(raw, validationFail, (r) => ({
    windowMinutes: r.optNum("windowMinutes") ?? undefined,
    limit: r.optNum("limit") ?? undefined,
    action: r.optStr("action") ?? undefined,
    entityType: r.optStr("entityType") ?? undefined,
    actorUserId: r.optNum("actorUserId") ?? undefined,
    onlyHighRisk: r.optBool("onlyHighRisk") ?? undefined,
  }));
}

export async function getAuditReaderSnapshot(
  rawParams?: unknown,
): Promise<AuditReaderSnapshot> {
  return runAction({
    name: "admin.audit_reader.snapshot.read",
    access: { kind: "permission", permission: "audit:read" },
    parse: () => parseAuditReaderFilter(rawParams),

    execute: (_ctx, filter) =>
      createAuditReaderService({
        events: getServerRuntime().admin.events,
      }).getSnapshot(filter),
  });
}
