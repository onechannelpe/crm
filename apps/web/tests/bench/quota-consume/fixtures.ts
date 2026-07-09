import type { TestDbContext } from "@tests/support/runtime/db";
import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { randomUUIDv7 } from "bun";

import { asBranchId, asUserId, type UserId } from "~/server/shared/ids";

import { BENCH_NOW } from "../_shared/constants";

export const USER_POOL_SIZE = 80;
const BRANCH_ID = asBranchId(TEST_FIXTURES.branches.lima.id);

export async function seedQuotaUsers(ctx: TestDbContext): Promise<UserId[]> {
  const users = Array.from({ length: USER_POOL_SIZE }, (_, index) => {
    const id = asUserId(randomUUIDv7());
    return {
      id,
      branch_id: BRANCH_ID,
      team_id: null,
      username: `bench.quota${index}`,
      email: `bench-quota-${index}@test.local`,
      password_hash: "hash",
      names: `Bench Quota ${index}`,
      first_surname: "User",
      second_surname: "Bench",
      onboarding_completed_at: BENCH_NOW,
      role: "executive" as const,
      executive_category: "elite" as const,
      is_active: true,
      created_at: BENCH_NOW,
    };
  });

  await ctx.db.insertInto("users").values(users).execute();
  return users.map((user) => user.id);
}
