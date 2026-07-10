import type { TestDbContext } from "@tests/support/runtime/db";
import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { randomUUIDv7 } from "bun";

import { hashInviteToken } from "~/lib/auth/invite/tokens";
import { asBranchId, asUserId } from "~/server/shared/ids";

import { BENCH_NOW, benchDate } from "../_shared/constants";

const BRANCH_ID = asBranchId(TEST_FIXTURES.branches.norte.id);
const CREATED_BY_USER_ID = asUserId(TEST_FIXTURES.users.superUser.id);

export interface PendingInvite {
  token: string;
  tokenHash: string;
}

export async function seedPendingInvite(
  ctx: TestDbContext,
): Promise<PendingInvite> {
  const suffix = randomUUIDv7();
  const userId = asUserId(randomUUIDv7());
  const email = `bench-team-invite-${suffix}@test.local`;

  await ctx.db
    .insertInto("users")
    .values({
      id: userId,
      branch_id: BRANCH_ID,
      team_id: null,
      username: `bench.invite.${suffix}`,
      email,
      password_hash: "bench-pending-hash",
      names: "Bench Invite",
      first_surname: "User",
      second_surname: "Bench",
      onboarding_completed_at: null,
      role: "executive",
      executive_category: "elite",
      is_active: false,
      created_at: BENCH_NOW,
    })
    .execute();

  const token = `bench-team-token-${suffix}`;
  const tokenHash = hashInviteToken(token);

  await ctx.db
    .insertInto("user_invites")
    .values({
      user_id: userId,
      branch_id: BRANCH_ID,
      email,
      role: "executive",
      token_hash: tokenHash,
      status: "pending",
      expires_at: benchDate(7 * 24 * 60 * 60 * 1000),
      created_by_user_id: CREATED_BY_USER_ID,
      accepted_at: null,
      revoked_at: null,
      created_at: BENCH_NOW,
      sent_at: null,
    })
    .execute();

  return { token, tokenHash };
}

export function freshInviteEmail(): string {
  return `bench-team-create-${randomUUIDv7()}@test.local`;
}
