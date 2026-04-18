import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";
import type { AuditPolicyRiskLevel } from "~/server/audit-reader/contracts";
import type { UserId } from "~/server/shared/ids";

export interface UpsertAuditActionPolicyInput {
  action: string;
  risk_level: AuditPolicyRiskLevel;
  is_active: number;
  is_protected: number;
  updated_by_user_id: UserId | null;
  now: number;
}

export function createAuditActionPoliciesRepo(db: Kysely<Database>) {
  return {
    listAll() {
      return db
        .selectFrom("audit_action_policies")
        .selectAll()
        .orderBy("is_protected", "desc")
        .orderBy("action", "asc")
        .execute();
    },

    findByAction(action: string) {
      return db
        .selectFrom("audit_action_policies")
        .selectAll()
        .where("action", "=", action)
        .executeTakeFirst();
    },

    upsert(input: UpsertAuditActionPolicyInput) {
      return db
        .insertInto("audit_action_policies")
        .values({
          action: input.action,
          risk_level: input.risk_level,
          is_active: input.is_active,
          is_protected: input.is_protected,
          updated_by_user_id: input.updated_by_user_id,
          created_at: input.now,
          updated_at: input.now,
        })
        .onConflict((oc) =>
          oc.column("action").doUpdateSet({
            risk_level: input.risk_level,
            is_active: input.is_active,
            is_protected: input.is_protected,
            updated_by_user_id: input.updated_by_user_id,
            updated_at: input.now,
          }),
        )
        .executeTakeFirstOrThrow();
    },
  };
}

export type AuditActionPoliciesRepo = ReturnType<
  typeof createAuditActionPoliciesRepo
>;
