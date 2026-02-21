import type { TestDbContext } from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";

export const USER_POOL_SIZE = 60;
const USER_ID_START = 40_000;
const SESSIONS_PER_USER = 800;

export interface SessionDeleteFixtures {
  userIds: number[];
}

export async function seedSessionDeleteFixtures(
  ctx: TestDbContext,
  sessionIdPrefix: string,
): Promise<SessionDeleteFixtures> {
  const users = Array.from({ length: USER_POOL_SIZE }, (_, index) => ({
    id: USER_ID_START + index,
    branch_id: 1,
    team_id: null,
    email: `bench-session-${USER_ID_START + index}@test.local`,
    password_hash: "hash",
    full_name: `Bench Session ${USER_ID_START + index}`,
    phone_e164: `+5199022${String(index).padStart(4, "0")}`,
    phone_verified_at: BENCH_NOW,
    profile_confirmed_at: BENCH_NOW,
    onboarding_completed_at: BENCH_NOW,
    strong_auth_required: 0,
    strong_auth_enrolled_at: null,
    role: "executive" as const,
    is_active: 1,
    created_at: BENCH_NOW,
  }));

  await ctx.db.insertInto("users").values(users).execute();
  const userIds = users.map((user) => user.id);

  for (const userId of userIds) {
    const sessions = Array.from({ length: SESSIONS_PER_USER }, (_, index) => ({
      id: `${sessionIdPrefix}-${userId}-${index}`,
      user_id: userId,
      branch_id: 1,
      role: "executive" as const,
      auth_method: "password" as const,
      strong_auth_at: null,
      ip_address: null,
      user_agent: "bench",
      created_at: BENCH_NOW,
      last_activity: BENCH_NOW,
      expires_at: BENCH_NOW + 60_000,
    }));

    await ctx.db.insertInto("user_sessions").values(sessions).execute();
  }

  return { userIds };
}

export function expectedSessionsPerUser() {
  return SESSIONS_PER_USER;
}
