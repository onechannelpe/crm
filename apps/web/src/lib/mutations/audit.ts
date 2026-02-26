import { action, json } from "@solidjs/router";

import { upsertAuditPolicy } from "~/actions/admin";
import { auditPolicySnapshotQuery } from "~/lib/queries/audit";

export const upsertAuditPolicyMutation = action(
  async (input: { action: string; riskLevel: string; isActive: boolean }) => {
    await upsertAuditPolicy(input);
    return json({}, { revalidate: auditPolicySnapshotQuery.key });
  },
  "upsertAuditPolicy",
);
