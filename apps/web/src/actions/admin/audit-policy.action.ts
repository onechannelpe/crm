type Composition = typeof import("~/server/admin/ui/audit-policies");

export async function getAuditPolicySnapshot(
  ...args: Parameters<Composition["getAuditPolicySnapshot"]>
) {
  "use server";
  const { getAuditPolicySnapshot: execute } =
    await import("~/server/admin/ui/audit-policies");
  return execute(...args);
}

export async function canManageAuditPolicies(
  ...args: Parameters<Composition["canManageAuditPolicies"]>
) {
  "use server";
  const { canManageAuditPolicies: execute } =
    await import("~/server/admin/ui/audit-policies");
  return execute(...args);
}

export async function upsertAuditPolicy(
  ...args: Parameters<Composition["upsertAuditPolicy"]>
) {
  "use server";
  const { upsertAuditPolicy: execute } =
    await import("~/server/admin/ui/audit-policies");
  return execute(...args);
}
