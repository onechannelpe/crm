import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  submitPasswordLogin,
  submitTotpForLoginFlow,
} from "../../src/lib/auth/login-flow";
import { hashPassword } from "../../src/lib/auth/password/password";
import type { SendPrivilegedLoginAlert } from "../../src/lib/auth/security/privileged-login-alert";
import {
  decryptTotpSecret,
  encryptTotpSecret,
} from "../../src/lib/auth/totp/secret-crypto";
import {
  generateCurrentTotpCode,
  generateTotpSecret,
} from "../../src/lib/auth/totp/totp";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("login flow service", () => {
  const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};
  let ctx: TestDbContext;

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("login-flow");
    await ctx.db
      .updateTable("users")
      .set({
        password_hash: await hashPassword("Secret123!"),
      })
      .where("id", "=", 1)
      .execute();
    await ctx.db
      .updateTable("users")
      .set({
        password_hash: await hashPassword("SuperSecret123!"),
      })
      .where("id", "=", 5)
      .execute();
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("completes a standard password login without creating a flow", async () => {
    const result = await submitPasswordLogin(
      {
        identifier: "exec.one",
        password: "Secret123!",
        ipAddress: "198.51.100.44",
        userAgent: "vitest-agent",
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );

    expect(result.kind).toBe("complete");
    const persisted = await ctx.db
      .selectFrom("login_flows")
      .select("id")
      .executeTakeFirst();
    expect(persisted).toBeUndefined();
  });

  it("creates a server-owned totp flow only when password login needs strong auth", async () => {
    const secret = generateTotpSecret();
    await ctx.repos.userTotpFactors.createOrRotate(
      5,
      await encryptTotpSecret(secret),
    );
    await ctx.repos.userTotpFactors.markEnabled(5);

    const passwordResult = await submitPasswordLogin(
      {
        identifier: "super.user",
        password: "SuperSecret123!",
        ipAddress: "198.51.100.88",
        userAgent: "vitest-agent",
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );

    expect(passwordResult.kind).toBe("totp_required");
    if (passwordResult.kind !== "totp_required") {
      throw new Error("expected totp_required");
    }

    const stored = await ctx.repos.loginFlows.findById(passwordResult.flow.id);
    expect(stored?.state).toBe("totp");
    expect(stored?.user_id).toBe(5);

    const factor = await ctx.repos.userTotpFactors.findByUserId(5);
    expect(factor).toBeDefined();
    const code = generateCurrentTotpCode(
      await decryptTotpSecret(factor!.secret_encrypted),
    );
    const totpResult = await submitTotpForLoginFlow(
      {
        flowId: passwordResult.flow.id,
        totpCode: code,
        ipAddress: "198.51.100.88",
        userAgent: "vitest-agent",
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );

    expect(totpResult.kind).toBe("complete");
    const consumed = await ctx.repos.loginFlows.findById(
      passwordResult.flow.id,
    );
    expect(consumed).toBeUndefined();
  });
});
