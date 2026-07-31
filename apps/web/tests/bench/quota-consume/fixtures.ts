import type { TestDbContext } from "@tests/support/runtime/db";
import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { randomUUIDv7 } from "bun";

import { BranchId, UserId } from "~/domain/ids";

import { BENCH_NOW } from "../_shared/constants";

const BRANCH_ID = BranchId.trust(TEST_FIXTURES.branches.lima.id);
const ACTOR_USER_ID = UserId.trust(TEST_FIXTURES.users.backOne.id);

export async function seedQuotaUser(ctx: TestDbContext): Promise<UserId> {
  const id = UserId.trust(randomUUIDv7());

  await ctx.db
    .insertInto("users")
    .values({
      id,
      branch_id: BRANCH_ID,
      team_id: null,
      username: "bench.quota",
      email: "bench-quota@test.local",
      password_hash: "hash",
      names: "Bench Quota",
      first_surname: "User",
      second_surname: "Bench",
      onboarding_completed_at: BENCH_NOW,
      role: "executive",
      executive_category: "elite",
      is_active: true,
      created_at: BENCH_NOW,
    })
    .execute();

  await ctx.repos.searchCapacityGrants.insert({
    user_id: id,
    actor_user_id: ACTOR_USER_ID,
    amount: 2,
    reason: "bench_seed",
  });

  return id;
}

export async function resetQuotaUsage(
  ctx: TestDbContext,
  userId: UserId,
): Promise<void> {
  await ctx.db
    .deleteFrom("search_usage_commits")
    .where(
      "reservation_id",
      "in",
      ctx.db
        .selectFrom("search_usage_reservations")
        .select("id")
        .where("user_id", "=", userId),
    )
    .execute();

  await ctx.db
    .deleteFrom("search_usage_reservations")
    .where("user_id", "=", userId)
    .execute();
}
