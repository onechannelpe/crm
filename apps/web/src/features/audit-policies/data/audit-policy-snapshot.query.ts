import { query } from "@solidjs/router";

type GetAuditPolicySnapshot =
  (typeof import("~/actions/admin/audit-policy.action"))["getAuditPolicySnapshot"];

export const auditPolicySnapshotQuery = query(
  async (...args: Parameters<GetAuditPolicySnapshot>) => {
    "use server";

    const { getAuditPolicySnapshot } =
      await import("~/actions/admin/audit-policy.action");
    return getAuditPolicySnapshot(...args);
  },
  "audit.policy-snapshot",
);
