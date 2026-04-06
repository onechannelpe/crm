import { query } from "@solidjs/router";

import {
  canManageAuditPolicies,
  getAuditPolicySnapshot,
} from "~/actions/admin/audit-policy";
import { getAuditReaderSnapshot } from "~/actions/admin/audit-reader";
import { getAuthFunnelSnapshot } from "~/actions/admin/auth-funnel";
import { getObservabilitySnapshot } from "~/actions/admin/observability";

export const observabilitySnapshotQuery = query(
  getObservabilitySnapshot,
  "observabilitySnapshot",
);

export const auditReaderSnapshotQuery = query(
  getAuditReaderSnapshot,
  "auditReaderSnapshot",
);

export const auditPolicySnapshotQuery = query(
  getAuditPolicySnapshot,
  "auditPolicySnapshot",
);

export const canManageAuditPoliciesQuery = query(
  canManageAuditPolicies,
  "canManageAuditPolicies",
);

export const authFunnelSnapshotQuery = query(
  getAuthFunnelSnapshot,
  "authFunnelSnapshot",
);
