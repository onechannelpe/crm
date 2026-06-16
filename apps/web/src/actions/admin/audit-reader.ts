"use server";

import { requirePermission } from "~/lib/auth/access/session";
import {
  type AuditReaderFilterInput,
  type AuditReaderSnapshot,
} from "~/server/audit-reader/contracts";
import { createAuditReaderService } from "~/server/audit-reader/service";
import { getServerRuntime } from "~/server/runtime";
import { throwDomain } from "~/server/shared/domain-error";
import { isErr } from "~/server/shared/result";

export async function getAuditReaderSnapshot(
  params?: AuditReaderFilterInput,
): Promise<AuditReaderSnapshot> {
  await requirePermission("audit:read");

  const service = createAuditReaderService({
    events: getServerRuntime().admin.events,
  });

  const result = await service.getSnapshot(params);

  if (isErr(result)) {
    throwDomain(result.error);
  }

  return result.value;
}
