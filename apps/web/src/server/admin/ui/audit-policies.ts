import "server-only";
import type { AuditPolicySnapshot } from "~/contracts/audit-reader/policy";
import { composeAdmin } from "~/server/admin/ui/composition";
import { createAuditPolicyService } from "~/server/audit-reader/policy-service";
import { executeAdminServerFunction } from "~/server/platform/action";
import { getSession, hasRole } from "~/server/platform/action/session";
import { Ok } from "~/shared/result";

function auditPolicyService() {
  return createAuditPolicyService({
    auditActionPolicies: composeAdmin().auditActionPolicies,
  });
}

export async function getAuditPolicySnapshot(): Promise<AuditPolicySnapshot> {
  return executeAdminServerFunction({
    name: "admin.audit_policy.snapshot.read",
    access: { kind: "permission", permission: "audit:read" },

    execute: async () => Ok(await auditPolicyService().getSnapshot()),
  });
}

export async function canManageAuditPolicies(): Promise<boolean> {
  const session = await getSession();

  if (!session) {
    return false;
  }

  return hasRole(session.role, "admin");
}
