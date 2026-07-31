import { action, json } from "@solidjs/router";

import { upsertAuditPolicy } from "~/rpc/admin/audit-policy";
import { auditPolicySnapshotQuery } from "~/rpc/audit-policies/audit-policy-snapshot";

export const upsertAuditPolicyMutation = action(
  async (input: { action: string; riskLevel: string; isActive: boolean }) => {
    await upsertAuditPolicy(input);
    return json({}, { revalidate: auditPolicySnapshotQuery.key });
  },
  "upsertAuditPolicy",
);
