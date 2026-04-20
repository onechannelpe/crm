import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { hashAuthKey } from "../../src/lib/auth/password/key-hash";
import { PasskeyRequestError } from "../../src/lib/auth/providers/passkey-provider";
import type { SendPrivilegedLoginAlert } from "../../src/lib/auth/security/privileged-login-alert";
import { createAuthThrottleService } from "../../src/server/auth/application/throttle-service";
import {
  createPasskeyEnrollmentAuthService,
  createPasskeyLoginFinishAuthService,
  createPasskeyLoginStartAuthService,
} from "../../src/server/auth/passkey/service";
import { asUserId, type UserId } from "../../src/server/shared/ids";
import { isErr } from "../../src/server/shared/result";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";

const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};

describe("passkey flows", () => {
  let ctx: TestDbContext;
  const USER_1 = asUserId("00000000-0000-0000-0000-000000000001");
  const USER_2 = asUserId("00000000-0000-0000-0000-000000000002");
  const ipAddress = "198.51.100.66";

  beforeEach(async () => {
    ctx = await createIsolatedTestDb("passkey-flows");
  });

  afterEach(async () => {
    await cleanupTestDb(ctx);
  });

  it("begin passkey login creates authentication challenge for active user", async () => {
    const result = await createPasskeyLoginStartAuthService(
      ctx.repos,
    ).beginLogin({
      identifier: "exec.one",
      ipAddress,
      mode: "identified",
    });
    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful passkey challenge");
    }

    expect(result.value.mode).toBe("identified");
    const flow = await ctx.repos.loginFlows.findById(result.value.id);
    const challenge = flow?.challenge_id
      ? await ctx.repos.webauthnChallenges.findById(flow.challenge_id)
      : undefined;
    expect(challenge?.type).toBe("authentication");
    expect(challenge?.user_id).toBe(USER_1);
    expect(challenge?.challenge).toBe(result.value.requestOptions.challenge);
  });

  it("begin discoverable passkey login creates an unscoped authentication challenge", async () => {
    const result = await createPasskeyLoginStartAuthService(
      ctx.repos,
    ).beginLogin({
      ipAddress,
      mode: "discoverable",
    });
    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful discoverable passkey challenge");
    }

    expect(result.value.mode).toBe("discoverable");
    expect(result.value.requestOptions.userVerification).toBe("required");

    const flow = await ctx.repos.loginFlows.findById(result.value.id);
    const challenge = flow?.challenge_id
      ? await ctx.repos.webauthnChallenges.findById(flow.challenge_id)
      : undefined;
    expect(flow?.user_id).toBeNull();
    expect(challenge?.user_id).toBeNull();
    expect(challenge?.challenge).toBe(result.value.requestOptions.challenge);
  });

  it("finish passkey login consumes challenge and records failure on invalid assertion", async () => {
    const challengeId = await ctx.repos.webauthnChallenges.create({
      user_id: USER_1,
      type: "authentication",
      challenge: "challenge-1",
      expires_at: Date.now() + 60_000,
    });
    const flowId = await ctx.repos.loginFlows.create({
      identifier: "exec.one",
      primary_auth_method: "passkey",
      user_id: USER_1,
      challenge_id: challengeId,
      state: "passkey",
      expires_at: Date.now() + 60_000,
    });

    const result = await createPasskeyLoginFinishAuthService(
      ctx.repos,
    ).finishLogin({
      flowId,
      response: {
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
      userAgent: "vitest-agent",
      sendPrivilegedLoginAlert,
    });
    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected invalid passkey credentials");
    }
    expect(result.error.kind).toBe("invalid_credentials");

    const consumed = await ctx.repos.webauthnChallenges.findById(challengeId);
    expect(consumed).toBeUndefined();

    const key = hashAuthKey(`account:passkey_verify:user:${USER_1}`);
    const counter = await ctx.repos.authThrottle.findByScopeAndKey(
      "account",
      key,
    );
    expect(counter?.failure_count).toBe(1);

    const retries = await ctx.repos.authEvents.findRecentLoginRetriesByUser(
      USER_1,
      5,
    );
    expect(retries[0]?.method).toBe("passkey");
    expect(retries[0]?.stage).toBe("verify");
    expect(retries[0]?.outcome).toBe("failure");
    expect(retries[0]?.reason).toBe("assertion_invalid");
  });

  it("begin passkey registration creates registration challenge", async () => {
    const result = await createPasskeyEnrollmentAuthService(
      ctx.repos,
    ).beginEnrollment({
      userId: USER_1,
      ipAddress,
    });

    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful passkey registration challenge");
    }

    const challenge = await ctx.repos.webauthnChallenges.findById(
      result.value.challengeId,
    );
    expect(challenge?.type).toBe("registration");
    expect(challenge?.user_id).toBe(USER_1);
    expect(challenge?.challenge).toBe(result.value.options.challenge);
  });

  it("returns invalid_request when passkey enrollment start is throttled", async () => {
    const throttleSvc = createAuthThrottleService({
      authThrottle: ctx.repos.authThrottle,
    });
    for (let attempt = 0; attempt < 9; attempt += 1) {
      await throttleSvc.recordPasskeyChallengeFailure(
        `user:${USER_1}`,
        ipAddress,
      );
    }

    const result = await createPasskeyEnrollmentAuthService(
      ctx.repos,
    ).beginEnrollment({
      userId: USER_1,
      ipAddress,
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected throttled passkey enrollment");
    }
    expect(result.error.code).toBe("invalid_request");
  });

  it("returns unexpected when passkey enrollment options fail", async () => {
    const result = await createPasskeyEnrollmentAuthService(ctx.repos, {
      createWebauthnProvider: () => ({
        async getRegistrationOptions() {
          throw new Error("boom");
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
          throw new Error("not used in this test");
        },
      }),
    }).beginEnrollment({
      userId: USER_1,
      ipAddress,
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected failed passkey enrollment start");
    }
    expect(result.error.code).toBe("unexpected");
  });

  it("finish passkey registration rejects challenge ownership mismatch", async () => {
    const challengeId = await ctx.repos.webauthnChallenges.create({
      user_id: USER_1,
      type: "registration",
      challenge: "challenge-r1",
      expires_at: Date.now() + 60_000,
    });

    const result = await createPasskeyEnrollmentAuthService(
      ctx.repos,
    ).finishEnrollment({
      userId: USER_2,
      challengeId,
      response: {
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
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected invalid passkey registration result");
    }
    expect(result.error.code).toBe("invalid_request");

    const key = hashAuthKey(`account:passkey_verify:user:${USER_2}`);
    const counter = await ctx.repos.authThrottle.findByScopeAndKey(
      "account",
      key,
    );
    expect(counter?.failure_count).toBe(1);
  });

  it("returns invalid_request when passkey enrollment verification fails", async () => {
    const challengeId = await ctx.repos.webauthnChallenges.create({
      user_id: USER_1,
      type: "registration",
      challenge: "challenge-r2",
      expires_at: Date.now() + 60_000,
    });

    const result = await createPasskeyEnrollmentAuthService(ctx.repos, {
      createWebauthnProvider: () => ({
        async getRegistrationOptions() {
          throw new Error("not used in this test");
        },
        async verifyRegistration() {
          throw new PasskeyRequestError("invalid registration");
        },
        async getAuthenticationOptions() {
          throw new Error("not used in this test");
        },
        async getAuthenticationOptionsForChallenge() {
          throw new Error("not used in this test");
        },
        async verifyAuthentication() {
          throw new Error("not used in this test");
        },
      }),
    }).finishEnrollment({
      userId: USER_1,
      challengeId,
      response: {
        id: "cred-r2",
        rawId: "cred-r2",
        type: "public-key",
        response: {
          clientDataJSON: "a",
          attestationObject: "b",
        },
        clientExtensionResults: {},
      },
      ipAddress,
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected invalid passkey verification result");
    }
    expect(result.error.code).toBe("invalid_request");
  });

  it("returns unexpected when passkey enrollment persistence fails after verification", async () => {
    const challengeId = await ctx.repos.webauthnChallenges.create({
      user_id: USER_1,
      type: "registration",
      challenge: "challenge-r3",
      expires_at: Date.now() + 60_000,
    });

    const result = await createPasskeyEnrollmentAuthService(ctx.repos, {
      createWebauthnProvider: () => ({
        async getRegistrationOptions() {
          throw new Error("not used in this test");
        },
        async verifyRegistration() {
          throw new Error("boom");
        },
        async getAuthenticationOptions() {
          throw new Error("not used in this test");
        },
        async getAuthenticationOptionsForChallenge() {
          throw new Error("not used in this test");
        },
        async verifyAuthentication() {
          throw new Error("not used in this test");
        },
      }),
    }).finishEnrollment({
      userId: USER_1,
      challengeId,
      response: {
        id: "cred-r3",
        rawId: "cred-r3",
        type: "public-key",
        response: {
          clientDataJSON: "a",
          attestationObject: "b",
        },
        clientExtensionResults: {},
      },
      ipAddress,
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected unexpected passkey verification failure");
    }
    expect(result.error.code).toBe("unexpected");
  });

  it("finish passkey login issues a session through the workflow service", async () => {
    const challengeId = await ctx.repos.webauthnChallenges.create({
      user_id: USER_1,
      type: "authentication",
      challenge: "challenge-workflow-1",
      expires_at: Date.now() + 60_000,
    });
    const flowId = await ctx.repos.loginFlows.create({
      identifier: "exec.one",
      primary_auth_method: "passkey",
      user_id: USER_1,
      challenge_id: challengeId,
      state: "passkey",
      expires_at: Date.now() + 60_000,
    });

    const result = await createPasskeyLoginFinishAuthService(ctx.repos, {
      createWebauthnProvider: () => ({
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
          return { verified: true, userId: USER_1 };
        },
      }),
    }).finishLogin({
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
    expect(result.value.token).toBeTruthy();
    expect(result.value.role).toBe("executive");
  });

  it("returns invalid_credentials for an empty passkey login identifier", async () => {
    const result = await createPasskeyLoginStartAuthService(
      ctx.repos,
    ).beginLogin({
      identifier: "   ",
      ipAddress,
      mode: "identified",
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected invalid passkey identifier");
    }
    expect(result.error.kind).toBe("invalid_credentials");
  });

  it("returns unexpected when passkey login flow persistence fails", async () => {
    await ctx.repos.passkeys.create({
      id: "pk-login-failure",
      user_id: USER_1,
      public_key: "base64-public-key",
      counter: 0,
      transports: JSON.stringify(["internal"]),
    });

    const result = await createPasskeyLoginStartAuthService({
      ...ctx.repos,
      loginFlows: {
        ...ctx.repos.loginFlows,
        async create() {
          throw new Error("boom");
        },
      },
    }).beginLogin({
      identifier: "exec.one",
      ipAddress,
      mode: "identified",
    });

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected unexpected passkey login start failure");
    }
    expect(result.error.kind).toBe("unexpected");
  });

  it("returns flow_expired for an invalid passkey login flow id", async () => {
    const result = await createPasskeyLoginFinishAuthService(
      ctx.repos,
    ).finishLogin({
      flowId: 0,
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

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected expired passkey flow");
    }
    expect(result.error.kind).toBe("flow_expired");
  });

  it("returns invalid_credentials when an identified passkey flow verifies a different user", async () => {
    const challengeId = await ctx.repos.webauthnChallenges.create({
      user_id: USER_1,
      type: "authentication",
      challenge: "challenge-mismatch-1",
      expires_at: Date.now() + 60_000,
    });
    const flowId = await ctx.repos.loginFlows.create({
      identifier: "exec.one",
      primary_auth_method: "passkey",
      user_id: USER_1,
      challenge_id: challengeId,
      state: "passkey",
      expires_at: Date.now() + 60_000,
    });

    const result = await createPasskeyLoginFinishAuthService(ctx.repos, {
      createWebauthnProvider: () => ({
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
          return { verified: true, userId: USER_2 };
        },
      }),
    }).finishLogin({
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

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected rejected mismatched passkey assertion");
    }
    expect(result.error.kind).toBe("invalid_credentials");
  });

  it("returns unexpected when passkey session issuance fails", async () => {
    const challengeId = await ctx.repos.webauthnChallenges.create({
      user_id: USER_1,
      type: "authentication",
      challenge: "challenge-workflow-2",
      expires_at: Date.now() + 60_000,
    });
    const flowId = await ctx.repos.loginFlows.create({
      identifier: "exec.one",
      primary_auth_method: "passkey",
      user_id: USER_1,
      challenge_id: challengeId,
      state: "passkey",
      expires_at: Date.now() + 60_000,
    });

    const result = await createPasskeyLoginFinishAuthService(ctx.repos, {
      createWebauthnProvider: () => ({
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
          return { verified: true, userId: USER_1 };
        },
      }),
      async issueLoginSession() {
        throw new Error("boom");
      },
    }).finishLogin({
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

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected unexpected passkey login completion failure");
    }
    expect(result.error.kind).toBe("unexpected");
  });
});
