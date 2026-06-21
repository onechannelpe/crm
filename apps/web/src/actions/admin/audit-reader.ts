"use server";

import type { AuditReaderSnapshot } from "~/contracts/audit-reader/snapshot";
import { createAuditReaderService } from "~/server/audit-reader/service";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";

export async function getAuditReaderSnapshot(
  rawParams?: unknown,
): Promise<AuditReaderSnapshot> {
  return runAction({
    name: "admin.audit_reader.snapshot.read",
    access: { kind: "permission", permission: "audit:read" },

    parse: () => {
      if (rawParams === undefined || rawParams === null) {
        return Ok({});
      }

      return parseObject(rawParams, validationFail, (r) => ({
        windowMinutes: r.optNum("windowMinutes") ?? undefined,
        limit: r.optNum("limit") ?? undefined,
        action: r.optStr("action") ?? undefined,
        entityType: r.optStr("entityType") ?? undefined,
        actorUserId: r.optNum("actorUserId") ?? undefined,
        onlyHighRisk: r.optBool("onlyHighRisk") ?? undefined,
      }));
    },

    execute: (_ctx, filter) =>
      createAuditReaderService({
        events: getServerRuntime().admin.events,
      }).getSnapshot(filter),
  });
}
