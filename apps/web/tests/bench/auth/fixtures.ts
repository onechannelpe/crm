import { hashPassword } from "~/lib/auth/password/password";

import type { TestDbContext } from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";

export const LOGIN_POOL_SIZE = 256;
const LOGIN_USER_ID_START = 10_000;
export const LOGIN_PASSWORD = "Secret123!";

export interface LoginFixture {
  email: string;
  ipAddress: string;
}

export async function seedAuthLoginFixtures(
  ctx: TestDbContext,
): Promise<LoginFixture[]> {
  const passwordHash = await hashPassword(LOGIN_PASSWORD);

  const users = Array.from({ length: LOGIN_POOL_SIZE }, (_, index) => {
    const id = LOGIN_USER_ID_START + index;
    return {
      id,
      branch_id: 1,
      team_id: null,
      email: `bench-auth-${id}@test.local`,
      password_hash: passwordHash,
      full_name: `Bench Auth ${id}`,
      phone_e164: `+5199001${String(index).padStart(4, "0")}`,
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

  return users.map((user, index) => ({
    email: user.email,
    ipAddress: `198.51.100.${(index % 200) + 1}`,
  }));
}
