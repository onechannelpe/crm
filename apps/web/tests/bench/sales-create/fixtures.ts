import { createAssignment } from "~/server/leads/domain-assignment";

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
    email: `bench-sales-create-${USER_ID_START + index}@test.local`,
    password_hash: "hash",
    full_name: `Bench Sales Create ${USER_ID_START + index}`,
    phone_e164: `+5199044${String(index).padStart(4, "0")}`,
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

  await ctx.repos.leadAssignments.createMany(
    userIds.map((userId) => createAssignment(userId, 1)),
  );

  return userIds;
}
