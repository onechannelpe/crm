import { composeAdmin } from "~/server/admin/ui/composition";
import {
  createAuditPolicyService,
  type UpsertAuditPolicyInput,
} from "~/server/audit-reader/policy-service";
import { executeAdminServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { Ok } from "~/shared/result";

export async function upsertAuditPolicy(input: unknown): Promise<void> {
  "use server";

  return executeAdminServerFunction({
    name: "admin.audit_policy.upsert",
    access: { kind: "role", role: "admin" },

    parse: () =>
      parseObject(input, validationFail, (reader) => ({
        action: reader.str("action"),
        riskLevel: reader.str("riskLevel"),
        isActive: reader.bool("isActive"),
      })),

    audit: ({ action, isActive }) => ({ action, isActive }),

    execute: async ({ actor }, fields) => {
      const policies = createAuditPolicyService({
        auditActionPolicies: composeAdmin().auditActionPolicies,
      });

      await policies.upsertPolicy({
        action: fields.action,
        riskLevel: fields.riskLevel,
        isActive: fields.isActive,
        actorUserId: actor.userId,
      } satisfies UpsertAuditPolicyInput);

      return Ok(undefined);
    },
  });
}
