import type { TestDbContext } from "@tests/support/runtime/db";
import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { randomUUIDv7 } from "bun";

import { hashInviteToken } from "~/lib/auth/invite/tokens";
import { asBranchId, asUserId } from "~/server/shared/ids";

import { BENCH_NOW, benchDate } from "../_shared/constants";

export const CREATE_POOL_SIZE = 80;
export const ACCEPT_POOL_SIZE = 80;
export const QUERY_POOL_SIZE = 80;
const BRANCH_ID = asBranchId(TEST_FIXTURES.branches.norte.id);
const CREATED_BY_USER_ID = asUserId(TEST_FIXTURES.users.superUser.id);

export interface AcceptFixture {
  token: string;
}

export interface TeamInviteFixtures {
  createEmails: string[];
  acceptFixtures: AcceptFixture[];
  pendingInviteTokenHashes: string[];
}

export async function seedTeamInviteFixtures(
  ctx: TestDbContext,
): Promise<TeamInviteFixtures> {
  const createEmails = Array.from(
    { length: CREATE_POOL_SIZE },
    (_, index) => `bench-team-create-${index}@test.local`,
  );

  const acceptFixtures: AcceptFixture[] = [];
  const pendingInviteTokenHashes: string[] = [];

  const acceptUsers = Array.from({ length: ACCEPT_POOL_SIZE }, (_, index) => ({
    id: asUserId(randomUUIDv7()),
    branch_id: BRANCH_ID,
    team_id: null,
    username: `bench.accept${index}`,
    email: `bench-team-accept-${index}@test.local`,
    password_hash: "bench-pending-hash",
    names: `Bench Accept ${index}`,
    first_surname: "User",
    second_surname: "Bench",
    onboarding_completed_at: null,
    role: "executive" as const,
    executive_category: "elite" as const,
    is_active: false,
    created_at: BENCH_NOW,
  }));
  const queryUsers = Array.from({ length: QUERY_POOL_SIZE }, (_, index) => ({
    id: asUserId(randomUUIDv7()),
    branch_id: BRANCH_ID,
    team_id: null,
    username: `bench.query${index}`,
    email: `bench-team-query-${index}@test.local`,
    password_hash: "bench-pending-hash",
    names: `Bench Query ${index}`,
    first_surname: "User",
    second_surname: "Bench",
    onboarding_completed_at: null,
    role: "executive" as const,
    executive_category: "elite" as const,
    is_active: false,
    created_at: BENCH_NOW,
  }));

  await ctx.db
    .insertInto("users")
    .values([...acceptUsers, ...queryUsers])
    .execute();

  const acceptInvites = acceptUsers.map((user, index) => {
    const token = `bench-team-token-${String(index).padStart(3, "0")}`;
    acceptFixtures.push({ token });
    return {
      user_id: user.id,
      branch_id: BRANCH_ID,
      email: user.email,
      role: "executive" as const,
      token_hash: hashInviteToken(token),
      status: "pending" as const,
      expires_at: benchDate(7 * 24 * 60 * 60 * 1000),
      created_by_user_id: CREATED_BY_USER_ID,
      accepted_at: null,
      revoked_at: null,
      created_at: BENCH_NOW,
      sent_at: null,
    };
  });

  const queryInvites = queryUsers.map((user, index) => {
    const token = `bench-team-query-token-${String(index).padStart(3, "0")}`;
    pendingInviteTokenHashes.push(hashInviteToken(token));
    return {
      user_id: user.id,
      branch_id: BRANCH_ID,
      email: user.email,
      role: "executive" as const,
      token_hash: hashInviteToken(token),
      status: "pending" as const,
      expires_at: benchDate(7 * 24 * 60 * 60 * 1000),
      created_by_user_id: CREATED_BY_USER_ID,
      accepted_at: null,
      revoked_at: null,
      created_at: BENCH_NOW,
      sent_at: null,
    };
  });

  await ctx.db
    .insertInto("user_invites")
    .values([...acceptInvites, ...queryInvites])
    .execute();

  return {
    createEmails,
    acceptFixtures,
    pendingInviteTokenHashes,
  };
}
