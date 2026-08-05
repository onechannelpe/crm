import type { AuditPolicySnapshot } from "~/contracts/audit-reader/policy";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import { getSession, hasRole } from "~/server/platform/action/session";
import { Ok } from "~/shared/result";

export async function getAuditPolicySnapshot(): Promise<AuditPolicySnapshot> {
  return executeSessionServerFunction({
    name: "admin.audit_policy.snapshot.read",
    access: { kind: "permission", permission: "audit:read" },

    execute: async () => Ok(await application.admin.getSnapshot()),
  });
}

export async function canManageAuditPolicies(): Promise<boolean> {
  const session = await getSession();

  if (!session) {
    return false;
  }

  return hasRole(session.role, "admin");
}
