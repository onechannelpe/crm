import type { Kysely } from "kysely";

import type { Database } from "~/lib/db/types";

const PROTECTED_HIGH_RISK_ACTIONS = [
  "all_sessions_revoked",
  "session_revoked_by_admin",
  "product_updated",
  "search_allowance_granted",
  "lead_refill_granted",
  "rate_limit_exceeded",
] as const;

export async function run(db: Kysely<any>): Promise<void> {
  // Seeds run through the migration harness, which passes an untyped Kysely.
  // Cast here validates table names against the schema so this seed fails to
  // compile if `audit_action_policies` is renamed without a migration update.
  // oxlint-disable-next-line typescript-eslint/no-unsafe-type-assertion
  const typed = db as unknown as Kysely<Database>;
  const seededAt = new Date(0);

  await typed
    .insertInto("audit_action_policies")
    .values(
      PROTECTED_HIGH_RISK_ACTIONS.map((action) => ({
        action,
        risk_level: "high" as const,
        is_active: true,
        is_protected: true,
        updated_by_user_id: null,
        created_at: seededAt,
        updated_at: seededAt,
      })),
    )
    .onConflict((oc) => oc.column("action").doNothing())
    .execute();
}
