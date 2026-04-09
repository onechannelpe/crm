"use server";

import { requirePermission } from "~/lib/auth/access/session";
import {
  type AuditReaderFilterInput,
  type AuditReaderSnapshot,
} from "~/server/audit-reader/contracts";
import { createAuditReaderService } from "~/server/audit-reader/service";
import { serverRuntime } from "~/server/runtime";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

export async function getAuditReaderSnapshot(
  params?: AuditReaderFilterInput,
): Promise<AuditReaderSnapshot> {
  await requirePermission("audit:read");
  const auditReaderService = createAuditReaderService({
    auditLogs: createAuditLogsRepo(serverRuntime.infra.db),
  });
  return auditReaderService.getSnapshot(params);
}
