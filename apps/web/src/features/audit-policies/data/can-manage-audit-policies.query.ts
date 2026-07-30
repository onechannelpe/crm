import { query } from "@solidjs/router";

type CanManageAuditPolicies =
  (typeof import("~/actions/admin/audit-policy.action"))["canManageAuditPolicies"];

export const canManageAuditPoliciesQuery = query(
  async (...args: Parameters<CanManageAuditPolicies>) => {
    "use server";

    const { canManageAuditPolicies } =
      await import("~/actions/admin/audit-policy.action");
    return canManageAuditPolicies(...args);
  },
  "audit.can-manage-policies",
);
