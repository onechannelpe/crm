"use server";

import { requirePermission } from "~/lib/auth/access/session";
import {
  type AuditReaderFilterInput,
  type AuditReaderSnapshot,
} from "~/server/audit-reader/contracts";
import { createAuditReaderService } from "~/server/audit-reader/service";
import { repos } from "~/server/shared/context";

const auditReaderService = createAuditReaderService({
  auditLogs: repos.auditLogs,
});

export async function getAuditReaderSnapshot(
  params?: AuditReaderFilterInput,
): Promise<AuditReaderSnapshot> {
  await requirePermission("audit:read");
  return auditReaderService.getSnapshot(params);
}
