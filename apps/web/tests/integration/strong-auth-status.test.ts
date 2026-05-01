import {
  enableIdentityPasskey,
  enableIdentityTotp,
  getSeededIdentity,
} from "@tests/support/identities/api";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";

describe("strong auth status", () => {
  let ctx: TestDbContext;
  const identity = getSeededIdentity("superuser");

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("strong-auth-status");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("derives verified strong auth from a configured passkey", async () => {
    await enableIdentityPasskey(ctx, identity, "pk-status-user-5");

    const status = await getStrongAuthStatus(identity.userId, ctx.repos);

    expect(status.hasPasskey).toBe(true);
    expect(status.passkeyCount).toBe(1);
    expect(status.hasTotp).toBe(false);
    expect(status.hasVerifiedStrongAuth).toBe(true);
  });

  it("derives verified strong auth from an enabled totp factor", async () => {
    await enableIdentityTotp(ctx, identity);

    const status = await getStrongAuthStatus(identity.userId, ctx.repos);

    expect(status.hasTotp).toBe(true);
    expect(status.hasPasskey).toBe(false);
    expect(status.hasVerifiedStrongAuth).toBe(true);
  });

  it("does not lose strong factors when a user role is downgraded", async () => {
    await enableIdentityTotp(ctx, identity);
    await enableIdentityPasskey(ctx, identity, "pk-status-downgrade-user-5");

    await ctx.repos.users.updateInviteProvisioning(identity.userId, {
      team_id: null,
      names: "Super",
      first_surname: "User",
      second_surname: "Test",
      role: "executive",
      is_active: 1,
    });

    const status = await getStrongAuthStatus(identity.userId, ctx.repos);

    expect(status.hasTotp).toBe(true);
    expect(status.hasPasskey).toBe(true);
    expect(status.passkeyCount).toBe(1);
    expect(status.hasVerifiedStrongAuth).toBe(true);
  });
});
