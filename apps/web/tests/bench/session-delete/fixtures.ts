import type { TestDbContext } from "@tests/support/runtime/db";
import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { randomUUIDv7 } from "bun";

import { asBranchId, asUserId, type UserId } from "~/server/shared/ids";

import { BENCH_NOW, benchDate } from "../_shared/constants";

// Heavy-but-plausible upper bound for one user's live sessions (many devices,
// long-lived logins). Representative, not maximal: the previous 60-user x 800
// = 48k seed existed only to feed a forced 60-iteration pool, which CodSpeed's
// analysis runner ignores (it measures a single call and handles repetition
// itself). One user's worth is the whole working set.
export const SESSIONS_PER_USER = 800;

const BRANCH_ID = asBranchId(TEST_FIXTURES.branches.lima.id);

export async function seedBenchUser(ctx: TestDbContext): Promise<UserId> {
  const id = asUserId(randomUUIDv7());
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

// Restores a deterministic precondition: exactly `count` sessions for `userId`.
// The delete bench calls this from beforeEach so every measured deleteAllForUser
// removes the same volume. 800 rows is a single ~10k-param insert (well under
// the 65k bind-param ceiling), fast enough that the reseed cost stays trivial.
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
