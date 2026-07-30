import { query } from "@solidjs/router";

import {
  canManageAuditPolicies,
  getAuditPolicySnapshot,
} from "~/actions/admin/audit-policy.action";

export const auditPolicySnapshotQuery = query(
  getAuditPolicySnapshot,
  "auditPolicySnapshot",
);

export const canManageAuditPoliciesQuery = query(
  canManageAuditPolicies,
  "canManageAuditPolicies",
);
