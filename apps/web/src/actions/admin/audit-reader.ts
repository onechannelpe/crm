"use server";

import {
  type AuditReaderFilterInput,
  type AuditReaderSnapshot,
} from "~/server/audit-reader/contracts";
import { createAuditReaderService } from "~/server/audit-reader/service";
import { getServerRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function getAuditReaderSnapshot(
  params?: AuditReaderFilterInput,
): Promise<AuditReaderSnapshot> {
  return runAction({
    name: "admin.audit_reader.snapshot.read",
    access: { kind: "permission", permission: "audit:read" },

    execute: () =>
      createAuditReaderService({
        events: getServerRuntime().admin.events,
      }).getSnapshot(params),
  });
}
