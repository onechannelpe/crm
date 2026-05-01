import type { SeededIdentityName } from "@tests/support/identities/api";
import { getSeededIdentity } from "@tests/support/identities/api";
import type { TestDbContext } from "@tests/support/runtime/db";

export async function seedBulkSessions(
  ctx: TestDbContext,
  identityName: SeededIdentityName,
  count: number,
  nowMs = Date.now(),
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
        created_at: nowMs,
        last_activity: nowMs,
        expires_at: nowMs + 60_000,
      })),
    )
    .execute();
}
