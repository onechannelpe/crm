import type { TestDbContext } from "@tests/support/runtime/db";
import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { randomUUIDv7 } from "bun";

import { hashAuthKey } from "~/server/auth/password/key-hash";
import { hashPassword } from "~/server/auth/password/password";
import { BranchId, UserId } from "~/domain/ids";

import { BENCH_NOW } from "../_shared/constants";

export const LOGIN_PASSWORD = "Secret123!";
const BRANCH_ID = BranchId.trust(TEST_FIXTURES.branches.lima.id);

export interface LoginFixture {
  userId: UserId;
  username: string;
  ipAddress: string;
}

export async function seedAuthLoginUser(
  ctx: TestDbContext,
): Promise<LoginFixture> {
  const passwordHash = await hashPassword(LOGIN_PASSWORD);
  const userId = UserId.trust(randomUUIDv7());
  const username = "bench.auth";
  const ipAddress = "198.51.100.10";

  await ctx.db
    .insertInto("users")
    .values({
      id: userId,
      branch_id: BRANCH_ID,
      team_id: null,
      username,
      email: "bench-auth@test.local",
      password_hash: passwordHash,
      names: "Bench Auth",
      first_surname: "User",
      second_surname: "Bench",
      onboarding_completed_at: BENCH_NOW,
      role: "executive",
      executive_category: "elite",
      is_active: true,
      created_at: BENCH_NOW,
    })
    .execute();

  await ctx.db
    .insertInto("auth_events")
    .values({
      user_id: userId,
      method: "password",
      stage: "login",
      outcome: "success",
      reason: null,
      identifier_hash: hashAuthKey(`id:${username}`),
      ip_hash: hashAuthKey(`ip:${ipAddress}`),
      created_at: BENCH_NOW,
    })
    .execute();

  return { userId, username, ipAddress };
}

export async function resetLoginState(
  ctx: TestDbContext,
  userId: UserId,
): Promise<void> {
  await ctx.db
    .deleteFrom("user_sessions")
    .where("user_id", "=", userId)
    .execute();
  await ctx.db.deleteFrom("auth_throttle_counters").execute();
}
