import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { getStrongAuthStatus } from "../../src/lib/auth/security/strong-auth-status";
import { encryptTotpSecret } from "../../src/lib/auth/totp/secret-crypto";
import { generateTotpSecret } from "../../src/lib/auth/totp/totp";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("strong auth status", () => {
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("strong-auth-status");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("derives verified strong auth from a configured passkey", async () => {
    await ctx.repos.passkeys.create({
      id: "pk-status-user-5",
      user_id: 5,
      public_key: "base64-public-key",
      counter: 0,
      transports: JSON.stringify(["internal"]),
    });

    const status = await getStrongAuthStatus(5, ctx.repos);

    expect(status.hasPasskey).toBe(true);
    expect(status.passkeyCount).toBe(1);
    expect(status.hasTotp).toBe(false);
    expect(status.hasVerifiedStrongAuth).toBe(true);
  });

  it("derives verified strong auth from an enabled totp factor", async () => {
    await ctx.repos.userTotpFactors.createOrRotate(
      5,
      await encryptTotpSecret(generateTotpSecret()),
    );
    await ctx.repos.userTotpFactors.markEnabled(5);

    const status = await getStrongAuthStatus(5, ctx.repos);

    expect(status.hasTotp).toBe(true);
    expect(status.hasPasskey).toBe(false);
    expect(status.hasVerifiedStrongAuth).toBe(true);
  });

  it("does not lose strong factors when a user role is downgraded", async () => {
    await ctx.repos.userTotpFactors.createOrRotate(
      5,
      await encryptTotpSecret(generateTotpSecret()),
    );
    await ctx.repos.userTotpFactors.markEnabled(5);
    await ctx.repos.passkeys.create({
      id: "pk-status-downgrade-user-5",
      user_id: 5,
      public_key: "base64-public-key",
      counter: 0,
      transports: JSON.stringify(["internal"]),
    });

    await ctx.repos.users.updateInviteProvisioning(5, {
      team_id: null,
      names: "Super",
      first_surname: "User",
      second_surname: "Test",
      role: "executive",
      is_active: 1,
    });

    const status = await getStrongAuthStatus(5, ctx.repos);

    expect(status.hasTotp).toBe(true);
    expect(status.hasPasskey).toBe(true);
    expect(status.passkeyCount).toBe(1);
    expect(status.hasVerifiedStrongAuth).toBe(true);
  });
});
