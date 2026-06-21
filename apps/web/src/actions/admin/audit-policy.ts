"use server";

import type { AuditPolicySnapshot } from "~/contracts/audit-reader/policy";
import { getSession, hasRole } from "~/lib/auth/access/session";
import {
  createAuditPolicyService,
  type UpsertAuditPolicyInput,
} from "~/server/audit-reader/policy-service";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";
import { parseObject, validationFail } from "~/server/shared/parsing";
import { Ok } from "~/server/shared/result";

function auditPolicyService() {
  return createAuditPolicyService({
    auditActionPolicies: getServerRuntime().admin.auditActionPolicies,
  });
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

  if (!session) {
    return false;
  }

  return hasRole(session.role, "admin");
}

export async function upsertAuditPolicy(input: unknown): Promise<void> {
  return runAction({
    name: "admin.audit_policy.upsert",
    access: { kind: "role", role: "admin" },

    parse: () =>
      parseObject(input, validationFail, (r) => ({
        action: r.str("action"),
        riskLevel: r.str("riskLevel"),
        isActive: r.bool("isActive"),
      })),

    audit: ({ action, isActive }) => ({
      action,
      isActive,
    }),

    execute: async ({ actor }, fields) =>
      Ok(
        await auditPolicyService().upsertPolicy({
          action: fields.action,
          riskLevel: fields.riskLevel,
          isActive: fields.isActive,
          actorUserId: actor.userId,
        } satisfies UpsertAuditPolicyInput),
      ),
  });
}
