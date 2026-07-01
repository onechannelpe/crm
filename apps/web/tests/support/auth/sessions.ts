import type { SeededIdentityName } from "@tests/support/identities/api";
import { getSeededIdentity } from "@tests/support/identities/api";
import type { TestDbContext } from "@tests/support/runtime/db";

export async function seedBulkSessions(
  ctx: TestDbContext,
  identityName: SeededIdentityName,
  count: number,
  now = new Date(),
): Promise<void> {
  const identity = getSeededIdentity(identityName);
  await ctx.db
    .insertInto("user_sessions")
    .values(
      Array.from({ length: count }, (_, index) => ({
        id: `bulk-${index}`,
        user_id: identity.userId,
        branch_id: identity.branchId,
        role: identity.role,
        session_class: "app" as const,
        primary_auth_method: "password" as const,
        strong_auth_method: null,
        strong_auth_at: null,
        ip_address: null,
        user_agent: null,
        created_at: now,
        last_activity: now,
        expires_at: new Date(now.getTime() + 60_000),
      })),
    )
    .execute();
}
