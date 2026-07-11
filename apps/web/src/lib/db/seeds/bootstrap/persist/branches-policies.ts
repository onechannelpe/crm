import { randomUUIDv7 } from "bun";
import type { Kysely } from "kysely";

import type { Database } from "../../../types";

export const INFINITY_BRANCH_ID = randomUUIDv7();

export async function persistBranchesAndPolicies(
  db: Kysely<Database>,
  now: Date,
): Promise<void> {
  await db
    .insertInto("branches")
    .values([{ id: INFINITY_BRANCH_ID, name: "Infinity", created_at: now }])
    .onConflict((oc) => oc.doNothing())
    .execute();

  await db
    .insertInto("search_policy_defaults")
    .values([
      {
        scope_type: "branch",
        scope_id: INFINITY_BRANCH_ID,
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
        scope_id: INFINITY_BRANCH_ID,
        active_buffer_target: 20,
        daily_refill_limit: 50,
        created_at: now,
        updated_at: now,
      },
    ])
    .onConflict((oc) => oc.doNothing())
    .execute();
}
