import {
  asBranchId,
  asUserId,
  type UserId,
} from "../../../src/server/shared/ids";
import type { TestDbContext } from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";

export const USER_POOL_SIZE = 80;
const USER_ID_PREFIX = "00000000-0000-0000-0000-00000004";

export async function seedQuotaUsers(ctx: TestDbContext): Promise<UserId[]> {
  const users = Array.from({ length: USER_POOL_SIZE }, (_, index) => {
    const userIdString = USER_ID_PREFIX + String(index).padStart(4, "0");
    const id = asUserId(userIdString);
    return {
      id,
      branch_id: asBranchId("00000000-0000-0000-0000-000000000011"),
      team_id: null,
      username: `bench.quota${index}`,
      email: `bench-quota-${id}@test.local`,
      password_hash: "hash",
      names: `Bench Quota ${id}`,
      first_surname: "User",
      second_surname: "Bench",
      phone_e164: `+5199011${String(index).padStart(4, "0")}`,
      onboarding_completed_at: BENCH_NOW,
      role: "executive" as const,
      executive_category: "elite" as const,
      is_active: 1,
      created_at: BENCH_NOW,
    };
  });

  await ctx.db.insertInto("users").values(users).execute();
  return users.map((user) => user.id);
}
