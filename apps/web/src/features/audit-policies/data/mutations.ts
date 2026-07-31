import { action, json } from "@solidjs/router";

import { upsertAuditPolicy } from "~/rpc/admin/audit-policy.action";
import { auditPolicySnapshotQuery } from "~/rpc/audit-policies/audit-policy-snapshot.query";

export const upsertAuditPolicyMutation = action(
  async (input: { action: string; riskLevel: string; isActive: boolean }) => {
    await upsertAuditPolicy(input);
    return json({}, { revalidate: auditPolicySnapshotQuery.key });
  },
  "upsertAuditPolicy",
);
