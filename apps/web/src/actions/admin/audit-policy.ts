"use server";

import {
  getSession,
  requirePermission,
  requireRole,
} from "~/lib/auth/access/session";
import { hasRole } from "~/lib/auth/access/session";
import type { AuditPolicySnapshot } from "~/server/audit-reader/contracts";
import {
  createAuditPolicyService,
  type UpsertAuditPolicyInput,
} from "~/server/audit-reader/policy-service";
import { getServerRuntime } from "~/server/runtime";

export async function getAuditPolicySnapshot(): Promise<AuditPolicySnapshot> {
  await requirePermission("audit:read");
  const auditPolicyService = createAuditPolicyService({
    auditActionPolicies: getServerRuntime().admin.auditActionPolicies,
  });
  return auditPolicyService.getSnapshot();
}

export async function canManageAuditPolicies(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return hasRole(session.role, "admin");
}

export async function upsertAuditPolicy(input: {
  action: string;
  riskLevel: string;
  isActive: boolean;
}): Promise<void> {
  const session = await requireRole("admin");
  const auditPolicyService = createAuditPolicyService({
    auditActionPolicies: getServerRuntime().admin.auditActionPolicies,
  });
  const payload: UpsertAuditPolicyInput = {
    action: input.action,
    riskLevel: input.riskLevel,
    isActive: input.isActive,
    actorUserId: session.userId,
  };
  await auditPolicyService.upsertPolicy(payload);
}
