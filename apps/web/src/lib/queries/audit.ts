import { query } from "@solidjs/router";

import {
  canManageAuditPolicies,
  getAuditPolicySnapshot,
  getAuditReaderSnapshot,
  getAuthFunnelSnapshot,
  getObservabilitySnapshot,
} from "~/actions/admin";

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
