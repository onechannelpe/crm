import type { TestDbContext } from "@tests/support/runtime/db";
import { TEST_FIXTURES } from "@tests/support/runtime/db";

import { hashPassword } from "~/lib/auth/password/password";
import { asBranchId, asUserId, type UserId } from "~/server/shared/ids";

import { BENCH_NOW } from "../_shared/constants";

export const LOGIN_POOL_SIZE = 256;
export const LOGIN_PASSWORD = "Secret123!";
const BRANCH_ID = asBranchId(TEST_FIXTURES.branches.lima.id);

export interface LoginFixture {
  userId: UserId;
  username: string;
  ipAddress: string;
}

export async function seedAuthLoginFixtures(
  ctx: TestDbContext,
): Promise<LoginFixture[]> {
  const passwordHash = await hashPassword(LOGIN_PASSWORD);

  const users = Array.from({ length: LOGIN_POOL_SIZE }, (_, index) => {
    const id = asUserId(`bench-auth-user-${index}`);
    return {
      id,
      branch_id: BRANCH_ID,
      team_id: null,
      username: `bench.auth${id}`,
      email: `bench-auth-${id}@test.local`,
      password_hash: passwordHash,
      names: `Bench Auth ${id}`,
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

  return users.map((user, index) => ({
    userId: user.id,
    username: user.username,
    ipAddress: `198.51.100.${(index % 200) + 1}`,
  }));
}
