import { action, json } from "@solidjs/router";

import { upsertAuditPolicy } from "~/actions/admin/audit-policy";
import { auditPolicySnapshotQuery } from "~/features/audit-policies/data/queries";

export const upsertAuditPolicyMutation = action(
  async (input: { action: string; riskLevel: string; isActive: boolean }) => {
    await upsertAuditPolicy(input);
    return json({}, { revalidate: auditPolicySnapshotQuery.key });
  },
  "upsertAuditPolicy",
);
