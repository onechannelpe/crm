import type { UpsertAuditPolicyInput } from "~/server/audit-reader/policy-service";
import { application } from "~/server/composition/application";
import { executeSessionServerFunction } from "~/server/platform/action";
import {
  parseObject,
  validationFail,
} from "~/server/platform/action/input-reader";
import { Ok } from "~/shared/result";

export async function upsertAuditPolicy(input: unknown): Promise<void> {
  "use server";

  return executeSessionServerFunction({
    name: "admin.audit_policy.upsert",
    access: { kind: "role", role: "admin" },

    parse: () =>
      parseObject(input, validationFail, (reader) => ({
        action: reader.str("action"),
        riskLevel: reader.str("riskLevel"),
        isActive: reader.bool("isActive"),
      })),

    telemetry: ({ action, isActive }) => ({ action, isActive }),

    execute: async (ctx, fields) => {
      await application.admin.upsertPolicy(
        {
          action: fields.action,
          riskLevel: fields.riskLevel,
          isActive: fields.isActive,
          actorUserId: ctx.actor.userId,
        } satisfies UpsertAuditPolicyInput,
        ctx,
      );

      return Ok(undefined);
    },
  });
}
