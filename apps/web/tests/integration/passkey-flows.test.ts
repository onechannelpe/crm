import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  beginPasskeyLoginFlow,
  finishPasskeyLoginFlow,
} from "../../src/lib/auth/passkey/login-flow";
import { createPasskeyService } from "../../src/lib/auth/passkey/passkey";
import {
  beginPasskeyRegistrationFlow,
  finishPasskeyRegistrationFlow,
} from "../../src/lib/auth/passkey/registration-flow";
import { createPasskeyWorkflowService } from "../../src/lib/auth/passkey/workflows";
import { hashAuthKey } from "../../src/lib/auth/password/key-hash";
import type { SendPrivilegedLoginAlert } from "../../src/lib/auth/security/privileged-login-alert";
import { isErr } from "../../src/server/shared/result";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

describe("passkey flows", () => {
  const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};
  let ctx: TestDbContext;
  const ipAddress = "198.51.100.66";

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("passkey-flows");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("begin passkey login creates authentication challenge for active user", async () => {
    const passkeyService = createPasskeyService(ctx.repos);
    const result = await beginPasskeyLoginFlow(
      "exec.one",
      ipAddress,
      ctx.repos,
      passkeyService,
    );
    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful passkey challenge");
    }

    const challenge = await ctx.repos.webauthnChallenges.findById(
      result.value.challengeId,
    );
    expect(challenge?.type).toBe("authentication");
    expect(challenge?.user_id).toBe(1);
    expect(challenge?.challenge).toBe(result.value.options.challenge);
  });

  it("finish passkey login consumes challenge and records failure on invalid assertion", async () => {
    const passkeyService = createPasskeyService(ctx.repos);
    const challengeId = await ctx.repos.webauthnChallenges.create({
      user_id: 1,
      type: "authentication",
      challenge: "challenge-1",
      expires_at: Date.now() + 60_000,
    });

    const result = await finishPasskeyLoginFlow(
      challengeId,
      {
        id: "missing-passkey",
        rawId: "missing-passkey",
        type: "public-key",
        clientExtensionResults: {},
        response: {
          authenticatorData: "a",
          clientDataJSON: "b",
          signature: "c",
        },
      },
      ipAddress,
      ctx.repos,
      passkeyService,
      sendPrivilegedLoginAlert,
    );
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected invalid passkey credentials");
    }
    expect(result.error.kind).toBe("invalid_credentials");

    const consumed = await ctx.repos.webauthnChallenges.findById(challengeId);
    expect(consumed).toBeUndefined();

    const key = hashAuthKey("account:passkey_verify:user:1");
    const counter = await ctx.repos.authThrottle.findByScopeAndKey(
      "account",
      key,
    );
    expect(counter?.failure_count).toBe(1);

    const retries = await ctx.repos.authEvents.findRecentLoginRetriesByUser(
      1,
      5,
    );
    expect(retries[0]?.method).toBe("passkey");
    expect(retries[0]?.stage).toBe("verify");
    expect(retries[0]?.outcome).toBe("failure");
    expect(retries[0]?.reason).toBe("assertion_invalid");
  });

  it("begin passkey registration creates registration challenge", async () => {
    const passkeyService = createPasskeyService(ctx.repos);
    const result = await beginPasskeyRegistrationFlow(
      1,
      ipAddress,
      ctx.repos,
      passkeyService,
    );

    const challenge = await ctx.repos.webauthnChallenges.findById(
      result.challengeId,
    );
    expect(challenge?.type).toBe("registration");
    expect(challenge?.user_id).toBe(1);
    expect(challenge?.challenge).toBe(result.options.challenge);
  });

  it("finish passkey registration rejects challenge ownership mismatch", async () => {
    const passkeyService = createPasskeyService(ctx.repos);
    const challengeId = await ctx.repos.webauthnChallenges.create({
      user_id: 1,
      type: "registration",
      challenge: "challenge-r1",
      expires_at: Date.now() + 60_000,
    });

    const result = await finishPasskeyRegistrationFlow(
      2,
      challengeId,
      {
        id: "cred-r1",
        rawId: "cred-r1",
        type: "public-key",
        response: {
          clientDataJSON: "a",
          attestationObject: "b",
        },
        clientExtensionResults: {},
      },
      ipAddress,
      ctx.repos,
      passkeyService,
    );

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected invalid passkey registration result");
    }
    expect(result.error.reason).toBe("invalid_request");

    const key = hashAuthKey("account:passkey_verify:user:2");
    const counter = await ctx.repos.authThrottle.findByScopeAndKey(
      "account",
      key,
    );
    expect(counter?.failure_count).toBe(1);
  });

  it("finish passkey login issues a session through the workflow service", async () => {
    const challengeId = await ctx.repos.webauthnChallenges.create({
      user_id: 1,
      type: "authentication",
      challenge: "challenge-workflow-1",
      expires_at: Date.now() + 60_000,
    });
    const flowId = await ctx.repos.loginFlows.create({
      identifier: "exec.one",
      user_id: 1,
      challenge_id: challengeId,
      state: "passkey",
      expires_at: Date.now() + 60_000,
    });

    const workflow = createPasskeyWorkflowService(ctx.repos, {
      createPasskeyService: () => ({
        async getRegistrationOptions() {
          throw new Error("not used in this test");
        },
        async verifyRegistration() {
          throw new Error("not used in this test");
        },
        async getAuthenticationOptions() {
          throw new Error("not used in this test");
        },
        async getAuthenticationOptionsForChallenge() {
          throw new Error("not used in this test");
        },
        async verifyAuthentication() {
          return { verified: true, userId: 1 };
        },
      }),
    });

    const result = await workflow.finishLogin({
      flowId,
      response: {
        id: "passkey-1",
        rawId: "passkey-1",
        type: "public-key",
        clientExtensionResults: {},
        response: {
          authenticatorData: "a",
          clientDataJSON: "b",
          signature: "c",
        },
      },
      ipAddress,
      userAgent: "vitest-agent",
      sendPrivilegedLoginAlert,
    });

    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful passkey login result");
    }

    const persisted = await ctx.repos.loginFlows.findById(flowId);
    expect(persisted).toBeUndefined();
    expect(result.value.result.token).toBeTruthy();
    expect(result.value.result.role).toBe("executive");
  });
});
