import { action, json } from "@solidjs/router";

import { upsertAuditPolicy } from "~/actions/admin/audit-policy.action";
import { auditPolicySnapshotQuery } from "~/features/audit-policies/data/audit-policy-snapshot.query";

export const upsertAuditPolicyMutation = action(
  async (input: { action: string; riskLevel: string; isActive: boolean }) => {
    await upsertAuditPolicy(input);
    return json({}, { revalidate: auditPolicySnapshotQuery.key });
  },
  "upsertAuditPolicy",
);
