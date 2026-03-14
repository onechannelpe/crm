import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  getLoginFlowState,
  submitPasswordLogin,
  submitTotpForLoginFlow,
} from "../../src/lib/auth/login-flow";
import { createPasskeyAuthService } from "../../src/lib/auth/passkey/service";
import type { SendPrivilegedLoginAlert } from "../../src/lib/auth/security/privileged-login-alert";
import { decryptTotpSecret } from "../../src/lib/auth/totp/secret-crypto";
import { generateCurrentTotpCode } from "../../src/lib/auth/totp/totp";
import { isErr } from "../../src/server/shared/result";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import {
  enableIdentityPasskey,
  enableIdentityTotp,
  getSeededIdentity,
  setIdentityPassword,
} from "../support/test-identities";

describe("login flow service", () => {
  const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};
  let ctx: TestDbContext;
  const execIdentity = getSeededIdentity("execOne");
  const superuserIdentity = getSeededIdentity("superuser");

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("login-flow");
    await setIdentityPassword(ctx, execIdentity, "Secret123!");
    await setIdentityPassword(ctx, superuserIdentity, "SuperSecret123!");
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
    await enableIdentityTotp(ctx, superuserIdentity);

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
    expect(stored?.user_id).toBe(superuserIdentity.userId);

    const factor = await ctx.repos.userTotpFactors.findByUserId(
      superuserIdentity.userId,
    );
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
    await enableIdentityPasskey(ctx, execIdentity, "pk-login-flow");

    const result = await createPasskeyAuthService(ctx.repos).beginLogin({
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
    expect(flow.requestOptions.challenge).toBe(
      result.value.requestOptions.challenge,
    );
  });

  it("returns unexpected when password login cannot create the required passkey flow", async () => {
    await enableIdentityPasskey(
      ctx,
      superuserIdentity,
      "pk-login-required-failure",
    );

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
