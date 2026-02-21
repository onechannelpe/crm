import type { TestDbContext } from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";

export const USER_POOL_SIZE = 80;
const USER_ID_START = 30_000;

export async function seedQuotaUsers(ctx: TestDbContext): Promise<number[]> {
  const users = Array.from({ length: USER_POOL_SIZE }, (_, index) => {
    const id = USER_ID_START + index;
    return {
      id,
      branch_id: 1,
      team_id: null,
      email: `bench-quota-${id}@test.local`,
      password_hash: "hash",
      full_name: `Bench Quota ${id}`,
      phone_e164: `+5199011${String(index).padStart(4, "0")}`,
      phone_verified_at: BENCH_NOW,
      profile_confirmed_at: BENCH_NOW,
      onboarding_completed_at: BENCH_NOW,
      strong_auth_required: 0,
      strong_auth_enrolled_at: null,
      role: "executive" as const,
      is_active: 1,
      created_at: BENCH_NOW,
    };
  });

  await ctx.db.insertInto("users").values(users).execute();
  return users.map((user) => user.id);
}
