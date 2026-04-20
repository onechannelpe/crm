import { hashPassword } from "~/lib/auth/password/password";

import {
  asBranchId,
  asUserId,
  type UserId,
} from "../../../src/server/shared/ids";
import type { TestDbContext } from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";

export const LOGIN_POOL_SIZE = 256;
const LOGIN_USER_ID_PREFIX = "00000000-0000-0000-0000-00000001";
export const LOGIN_PASSWORD = "Secret123!";

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
    const userIdString = LOGIN_USER_ID_PREFIX + String(index).padStart(4, "0");
    const id = asUserId(userIdString);
    return {
      id,
      branch_id: asBranchId("00000000-0000-0000-0000-000000000011"),
      team_id: null,
      username: `bench.auth${index}`,
      email: `bench-auth-${id}@test.local`,
      password_hash: passwordHash,
      names: `Bench Auth ${id}`,
      first_surname: "User",
      second_surname: "Bench",
      phone_e164: `+5199001${String(index).padStart(4, "0")}`,
      onboarding_completed_at: BENCH_NOW,
      role: "executive" as const,
      executive_category: "elite" as const,
      is_active: 1,
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
