import type { Kysely } from "kysely";

import type { Database } from "../../../types";

export async function persistAuditActionPolicies(
  db: Kysely<Database>,
  now: number,
): Promise<void> {
  // Audit policies
  await db
    .insertInto("audit_action_policies")
    .values([
      {
        action: "all_sessions_revoked",
        risk_level: "high",
        is_active: 1,
        is_protected: 1,
        updated_by_user_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        action: "session_revoked_by_admin",
        risk_level: "high",
        is_active: 1,
        is_protected: 1,
        updated_by_user_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        action: "search_allowance_granted",
        risk_level: "high",
        is_active: 1,
        is_protected: 1,
        updated_by_user_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        action: "lead_refill_granted",
        risk_level: "high",
        is_active: 1,
        is_protected: 1,
        updated_by_user_id: null,
        created_at: now,
        updated_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();
}
