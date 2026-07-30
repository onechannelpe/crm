import { query } from "@solidjs/router";

import { canManageAuditPolicies } from "~/server/admin/ui/audit-policies";

export const canManageAuditPoliciesQuery = query(
  async () => {
    "use server";
    return canManageAuditPolicies();
  },
  "audit.can-manage-policies",
);
