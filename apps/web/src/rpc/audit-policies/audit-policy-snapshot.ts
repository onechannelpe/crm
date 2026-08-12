import { query } from "@solidjs/router";

import { getAuditPolicySnapshot } from "~/server/admin/ui/audit-policies";

export const auditPolicySnapshotQuery = query(async () => {
  "use server";
  return getAuditPolicySnapshot();
}, "audit.policy-snapshot");
