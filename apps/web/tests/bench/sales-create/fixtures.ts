import type { TestDbContext } from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";

export const USER_POOL_SIZE = 96;
const USER_ID_START = 100_000;

export async function seedSalesCreateUsers(
  ctx: TestDbContext,
): Promise<number[]> {
  const users = Array.from({ length: USER_POOL_SIZE }, (_, index) => ({
    id: USER_ID_START + index,
    branch_id: 1,
    team_id: null,
    username: `bench.sls${USER_ID_START + index}`,
    email: `bench-sales-create-${USER_ID_START + index}@test.local`,
    password_hash: "hash",
    names: `Bench Sales Create ${USER_ID_START + index}`,
    first_surname: "User",
    second_surname: "Bench",
    phone_e164: `+5199044${String(index).padStart(4, "0")}`,
    onboarding_completed_at: BENCH_NOW,
    role: "executive" as const,
    is_active: 1,
    created_at: BENCH_NOW,
  }));

  await ctx.db.insertInto("users").values(users).execute();
  return users.map((user) => user.id);
}
