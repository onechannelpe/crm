"use server";

import type { AuditPolicySnapshot } from "~/contracts/audit-reader/policy";
import { getSession, hasRole } from "~/lib/auth/access/session";
import {
  createAuditPolicyService,
  type UpsertAuditPolicyInput,
} from "~/server/audit-reader/policy-service";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import type { DomainError } from "~/server/shared/domain-error";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok, type Result } from "~/server/shared/result";

type UpsertAuditPolicyFields = {
  action: string;
  riskLevel: string;
  isActive: boolean;
};

function auditPolicyService() {
  return createAuditPolicyService({
    auditActionPolicies: getServerRuntime().admin.auditActionPolicies,
  });
}

function parseUpsertAuditPolicy(
  raw: unknown,
): Result<UpsertAuditPolicyFields, DomainError> {
  return parseObject(raw, validationFail, (r) => ({
    action: r.str("action"),
    riskLevel: r.str("riskLevel"),
    isActive: r.bool("isActive"),
  }));
}

export async function getAuditPolicySnapshot(): Promise<AuditPolicySnapshot> {
  return runAction({
    name: "admin.audit_policy.snapshot.read",
    access: { kind: "permission", permission: "audit:read" },

    execute: async () => Ok(await auditPolicyService().getSnapshot()),
  });
}

export async function canManageAuditPolicies(): Promise<boolean> {
  const session = await getSession();
  if (!session) return false;
  return hasRole(session.role, "admin");
}

export async function upsertAuditPolicy(input: unknown): Promise<void> {
  return runAction({
    name: "admin.audit_policy.upsert",
    access: { kind: "role", role: "admin" },
    parse: () => parseUpsertAuditPolicy(input),
    audit: (fields) => ({ action: fields.action, isActive: fields.isActive }),

    execute: async (ctx, fields) => {
      const payload: UpsertAuditPolicyInput = {
        action: fields.action,
        riskLevel: fields.riskLevel,
        isActive: fields.isActive,
        actorUserId: ctx.actor.userId,
      };
      return Ok(await auditPolicyService().upsertPolicy(payload));
    },
  });
}
