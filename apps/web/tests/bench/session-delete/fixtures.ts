import type { TestDbContext } from "@tests/support/runtime/db";
import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { randomUUIDv7 } from "bun";

import { asBranchId, asUserId, type UserId } from "~/server/shared/ids";

import { BENCH_NOW, benchDate } from "../_shared/constants";

export const USER_POOL_SIZE = 60;
const SESSIONS_PER_USER = 800;
const SESSION_INSERT_CHUNK_SIZE = 4_000;
const BRANCH_ID = asBranchId(TEST_FIXTURES.branches.lima.id);

export interface SessionDeleteFixtures {
  userIds: UserId[];
}

export async function seedSessionDeleteFixtures(
  ctx: TestDbContext,
  sessionIdPrefix: string,
): Promise<SessionDeleteFixtures> {
  const users = Array.from({ length: USER_POOL_SIZE }, (_, index) => ({
    id: asUserId(randomUUIDv7()),
    branch_id: BRANCH_ID,
    team_id: null,
    username: `bench.ses${index}`,
    email: `bench-session-${index}@test.local`,
    password_hash: "hash",
    names: `Bench Session ${index}`,
    first_surname: "User",
    second_surname: "Bench",
    onboarding_completed_at: BENCH_NOW,
    role: "executive" as const,
    executive_category: "elite" as const,
    is_active: true,
    created_at: BENCH_NOW,
  }));

  await ctx.db.insertInto("users").values(users).execute();
  const userIds = users.map((user) => user.id);
  const sessions = userIds.flatMap((userId) =>
    Array.from({ length: SESSIONS_PER_USER }, (_, index) => ({
      id: `${sessionIdPrefix}-${userId}-${index}`,
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
    })),
  );

  for (
    let offset = 0;
    offset < sessions.length;
    offset += SESSION_INSERT_CHUNK_SIZE
  ) {
    await ctx.db
      .insertInto("user_sessions")
      .values(sessions.slice(offset, offset + SESSION_INSERT_CHUNK_SIZE))
      .execute();
  }

  return { userIds };
}

export function expectedSessionsPerUser() {
  return SESSIONS_PER_USER;
}
