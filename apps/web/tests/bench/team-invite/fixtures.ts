import type { TestDbContext } from "@tests/support/runtime/db";

import { hashInviteToken } from "~/lib/auth/invite/tokens";

import { BENCH_NOW } from "../_shared/constants";

export const CREATE_POOL_SIZE = 80;
export const ACCEPT_POOL_SIZE = 80;
export const QUERY_POOL_SIZE = 80;
const ACCEPT_USER_ID_START = 110_000;
const QUERY_USER_ID_START = 120_000;

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
    id: ACCEPT_USER_ID_START + index,
    branch_id: 2,
    team_id: null,
    username: `bench.accept${ACCEPT_USER_ID_START + index}`,
    email: `bench-team-accept-${index}@test.local`,
    password_hash: "bench-pending-hash",
    names: `Bench Accept ${index}`,
    first_surname: "User",
    second_surname: "Bench",
    phone_e164: null,
    onboarding_completed_at: null,
    role: "executive" as const,
    executive_category: "elite" as const,
    is_active: 0,
    created_at: BENCH_NOW,
  }));
  const queryUsers = Array.from({ length: QUERY_POOL_SIZE }, (_, index) => ({
    id: QUERY_USER_ID_START + index,
    branch_id: 2,
    team_id: null,
    username: `bench.query${QUERY_USER_ID_START + index}`,
    email: `bench-team-query-${index}@test.local`,
    password_hash: "bench-pending-hash",
    names: `Bench Query ${index}`,
    first_surname: "User",
    second_surname: "Bench",
    phone_e164: null,
    onboarding_completed_at: null,
    role: "executive" as const,
    executive_category: "elite" as const,
    is_active: 0,
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
      branch_id: 2,
      email: user.email,
      role: "executive" as const,
      token_hash: hashInviteToken(token),
      status: "pending" as const,
      expires_at: BENCH_NOW + 7 * 24 * 60 * 60 * 1000,
      created_by_user_id: 5,
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
      branch_id: 2,
      email: user.email,
      role: "executive" as const,
      token_hash: hashInviteToken(token),
      status: "pending" as const,
      expires_at: BENCH_NOW + 7 * 24 * 60 * 60 * 1000,
      created_by_user_id: 5,
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
