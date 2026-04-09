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
import { serverRuntime } from "~/server/runtime";
import { createAuditActionPoliciesRepo } from "~/server/shared/repos-audit-action-policies";

export async function getAuditPolicySnapshot(): Promise<AuditPolicySnapshot> {
  await requirePermission("audit:read");
  const auditPolicyService = createAuditPolicyService({
    auditActionPolicies: createAuditActionPoliciesRepo(serverRuntime.infra.db),
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
    auditActionPolicies: createAuditActionPoliciesRepo(serverRuntime.infra.db),
  });
  const payload: UpsertAuditPolicyInput = {
    action: input.action,
    riskLevel: input.riskLevel,
    isActive: input.isActive,
    actorUserId: session.userId,
  };
  await auditPolicyService.upsertPolicy(payload);
}
