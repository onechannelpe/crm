"use server";

import { requirePermission } from "~/lib/auth/access/session";
import {
  type AuditReaderFilterInput,
  type AuditReaderSnapshot,
} from "~/server/audit-reader/contracts";
import { createAuditReaderService } from "~/server/audit-reader/service";
import { serverRuntime } from "~/server/runtime";

export async function getAuditReaderSnapshot(
  params?: AuditReaderFilterInput,
): Promise<AuditReaderSnapshot> {
  await requirePermission("audit:read");
  const auditReaderService = createAuditReaderService({
    auditLogs: serverRuntime.admin.auditLogs,
  });
  return auditReaderService.getSnapshot(params);
}
