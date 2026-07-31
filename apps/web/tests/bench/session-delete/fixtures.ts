import type { TestDbContext } from "@tests/support/runtime/db";
import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { randomUUIDv7 } from "bun";

import { BranchId, UserId } from "~/domain/ids";

import { BENCH_NOW, benchDate } from "../_shared/constants";

export const SESSIONS_PER_USER = 800;

const BRANCH_ID = BranchId.trust(TEST_FIXTURES.branches.lima.id);

export async function seedBenchUser(ctx: TestDbContext): Promise<UserId> {
  const id = UserId.trust(randomUUIDv7());
  await ctx.db
    .insertInto("users")
    .values({
      id,
      branch_id: BRANCH_ID,
      team_id: null,
      username: "bench.session",
      email: "bench-session@test.local",
      password_hash: "hash",
      names: "Bench Session",
      first_surname: "User",
      second_surname: "Bench",
      onboarding_completed_at: BENCH_NOW,
      role: "executive",
      executive_category: "elite",
      is_active: true,
      created_at: BENCH_NOW,
    })
    .execute();
  return id;
}

// Reseed exactly count sessions before each measured delete.
export async function setUserSessions(
  ctx: TestDbContext,
  userId: UserId,
  count: number,
): Promise<void> {
  await ctx.db
    .deleteFrom("user_sessions")
    .where("user_id", "=", userId)
    .execute();

  const sessions = Array.from({ length: count }, (_, index) => ({
    id: `bench-session-${userId}-${index}`,
    user_id: userId,
    branch_id: BRANCH_ID,
    role: "executive" as const,
    session_class: "app" as const,
    primary_auth_method: "password" as const,
    strong_auth_method: null,
    strong_auth_at: null,
    ip_address: null,
    user_agent: "bench",
    created_at: BENCH_NOW,
    last_activity: BENCH_NOW,
    expires_at: benchDate(60_000),
  }));

  await ctx.db.insertInto("user_sessions").values(sessions).execute();
}
