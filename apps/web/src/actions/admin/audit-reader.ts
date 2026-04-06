"use server";

import { requirePermission } from "~/lib/auth/access/session";
import { db } from "~/lib/db/db";
import {
  type AuditReaderFilterInput,
  type AuditReaderSnapshot,
} from "~/server/audit-reader/contracts";
import { createAuditReaderService } from "~/server/audit-reader/service";
import { createAuditLogsRepo } from "~/server/shared/repos-audit-logs";

const auditReaderService = createAuditReaderService({
  auditLogs: createAuditLogsRepo(db),
});

export async function getAuditReaderSnapshot(
  params?: AuditReaderFilterInput,
): Promise<AuditReaderSnapshot> {
  await requirePermission("audit:read");
  return auditReaderService.getSnapshot(params);
}
