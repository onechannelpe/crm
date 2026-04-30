import type { Kysely } from "kysely";

import type { Database } from "../../../types";

export async function persistBranchesAndPolicies(
  db: Kysely<Database>,
  now: number,
): Promise<void> {
  await db
    .insertInto("branches")
    .values([{ id: 4, name: "Infinity", created_at: now }])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("search_policy_defaults")
    .values([
      {
        scope_type: "branch",
        scope_id: 4,
        period_type: "month",
        search_limit: 500,
        created_at: now,
        updated_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("lead_policy_defaults")
    .values([
      {
        scope_type: "branch",
        scope_id: 4,
        active_buffer_target: 20,
        daily_refill_limit: 50,
        created_at: now,
        updated_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();
}
