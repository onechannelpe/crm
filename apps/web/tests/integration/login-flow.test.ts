import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getLoginFlowState,
  submitPasswordLogin,
  submitTotpForLoginFlow,
} from "../../src/lib/auth/login-flow";
import { createPasskeyLoginWorkflowService } from "../../src/lib/auth/passkey/workflows";
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
import { isErr } from "../../src/server/shared/result";
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

    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful password login");
    }
    expect(result.value.kind).toBe("complete");
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

    expect(isErr(passwordResult)).toBe(false);
    if (
      isErr(passwordResult) ||
      passwordResult.value.kind !== "totp_required"
    ) {
      throw new Error("expected totp_required");
    }

    const stored = await ctx.repos.loginFlows.findById(
      passwordResult.value.flow.id,
    );
    expect(stored?.state).toBe("totp");
    expect(stored?.user_id).toBe(5);

    const factor = await ctx.repos.userTotpFactors.findByUserId(5);
    expect(factor).toBeDefined();
    const code = generateCurrentTotpCode(
      await decryptTotpSecret(factor!.secret_encrypted),
    );
    const totpResult = await submitTotpForLoginFlow(
      {
        flowId: passwordResult.value.flow.id,
        totpCode: code,
        ipAddress: "198.51.100.88",
        userAgent: "vitest-agent",
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );

    expect(isErr(totpResult)).toBe(false);
    const consumed = await ctx.repos.loginFlows.findById(
      passwordResult.value.flow.id,
    );
    expect(consumed).toBeUndefined();
  });

  it("creates a server-owned passkey flow with reusable request options", async () => {
    await ctx.repos.passkeys.create({
      id: "pk-login-flow",
      user_id: 1,
      public_key: "base64-public-key",
      counter: 0,
      transports: JSON.stringify(["internal"]),
    });

    const workflow = createPasskeyLoginWorkflowService(ctx.repos);
    const result = await workflow.beginLogin({
      identifier: "exec.one",
      ipAddress: "198.51.100.55",
    });

    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected passkey flow");
    }

    const flow = await getLoginFlowState(result.value.id, ctx.repos);
    expect(flow?.state).toBe("passkey");
    if (!flow || flow.state !== "passkey") {
      throw new Error("expected passkey state");
    }
    expect(flow.requestOptions.allowCredentials).toHaveLength(1);
    expect(flow.requestOptions.rpId).toBe(result.value.requestOptions.rpId);
  });

  it("returns unexpected when password login cannot create the required passkey flow", async () => {
    await ctx.repos.passkeys.create({
      id: "pk-login-required-failure",
      user_id: 5,
      public_key: "base64-public-key",
      counter: 0,
      transports: JSON.stringify(["internal"]),
    });

    const result = await submitPasswordLogin(
      {
        identifier: "super.user",
        password: "SuperSecret123!",
        ipAddress: "198.51.100.77",
        userAgent: "vitest-agent",
      },
      {
        ...ctx.repos,
        loginFlows: {
          ...ctx.repos.loginFlows,
          async create() {
            throw new Error("boom");
          },
        },
      },
      sendPrivilegedLoginAlert,
    );

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected unexpected password login failure");
    }
    expect(result.error.kind).toBe("unexpected");
  });
});
