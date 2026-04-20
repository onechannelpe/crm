import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { completeGoogleOAuthCallback } from "../../src/lib/auth/google/google-callback-login";
import type { SendPrivilegedLoginAlert } from "../../src/lib/auth/security/privileged-login-alert";
import { type UserId } from "../../src/server/shared/ids";
import { Err, Ok, isErr } from "../../src/server/shared/result";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import {
  getSeededIdentity,
  setIdentityOnboarding,
} from "../support/test-identities";

const mocks = vi.hoisted(() => ({
  authenticateGoogleAuthorizationCode: vi.fn<() => Promise<unknown>>(),
}));

vi.mock("../../src/lib/auth/google/google-oauth", () => ({
  authenticateGoogleAuthorizationCode:
    mocks.authenticateGoogleAuthorizationCode,
}));

const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};

describe("google oauth callback login", () => {
  let ctx: TestDbContext;
  const request = {
    code: "google-code-1",
    state: "expected-state",
    storedState: "expected-state",
    codeVerifier: "pkce-verifier-1",
    ipAddress: "198.51.100.41",
    userAgent: "vitest-agent",
  };

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(1_700_000_000_000);
    vi.clearAllMocks();
    ctx = await createIsolatedTestDb("google-oauth-callback-login");
  });

  afterEach(async () => {
    vi.useRealTimers();
    await cleanupTestDb(ctx);
  });

  async function linkGoogleAccount(userId: UserId, sub: string) {
    await ctx.repos.oauthAccounts.create({
      user_id: userId,
      provider: "google",
      provider_user_id: sub,
      email: `${sub}@example.test`,
      created_at: Date.now(),
    });
  }

  it("returns bad_request when callback state does not match", async () => {
    const result = await completeGoogleOAuthCallback(
      {
        ...request,
        state: "wrong-state",
      },
      ctx.repos,
      sendPrivilegedLoginAlert,
    );

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected bad_request result");
    }
    expect(result.error).toEqual({ kind: "bad_request" });
    expect(mocks.authenticateGoogleAuthorizationCode).not.toHaveBeenCalled();
  });

  it("returns google_not_linked when provider account is unknown", async () => {
    mocks.authenticateGoogleAuthorizationCode.mockResolvedValue(
      Ok({
        sub: "google-sub-missing",
        email: "missing@example.test",
        name: "Missing User",
      }),
    );

    const result = await completeGoogleOAuthCallback(
      request,
      ctx.repos,
      sendPrivilegedLoginAlert,
    );

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected redirect_to_login result");
    }
    expect(result.error).toEqual({
      kind: "redirect_to_login",
      error: "google_not_linked",
    });
  });

  it("returns strong_auth_required for linked privileged users without strong auth", async () => {
    const identity = getSeededIdentity("superuser");
    await linkGoogleAccount(identity.userId, "google-sub-super-1");

    mocks.authenticateGoogleAuthorizationCode.mockResolvedValue(
      Ok({
        sub: "google-sub-super-1",
        email: "super@test.local",
        name: "Super User",
      }),
    );

    const result = await completeGoogleOAuthCallback(
      request,
      ctx.repos,
      sendPrivilegedLoginAlert,
    );

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected redirect_to_login result");
    }
    expect(result.error).toEqual({
      kind: "redirect_to_login",
      error: "strong_auth_required",
    });
  });

  it("issues an app session for linked non-privileged users", async () => {
    const identity = getSeededIdentity("backOne");
    await linkGoogleAccount(identity.userId, "google-sub-back-1");

    mocks.authenticateGoogleAuthorizationCode.mockResolvedValue(
      Ok({
        sub: "google-sub-back-1",
        email: "back1@test.local",
        name: "Back One",
      }),
    );

    const result = await completeGoogleOAuthCallback(
      request,
      ctx.repos,
      sendPrivilegedLoginAlert,
    );

    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful callback result");
    }
    expect(result.value.redirectPath).toBe("/");
    expect(result.value.sessionToken).toBeTruthy();

    const sessions = await ctx.repos.sessions.listForUser(identity.userId);
    expect(sessions[0]?.session_class).toBe("app");
    expect(sessions[0]?.ip_address).toBe(request.ipAddress);
    expect(sessions[0]?.user_agent).toBe(request.userAgent);
  });

  it("issues a pre-auth session and onboarding redirect when onboarding is incomplete", async () => {
    const identity = getSeededIdentity("backOne");
    await setIdentityOnboarding(ctx, identity, false);
    await linkGoogleAccount(identity.userId, "google-sub-back-2");

    mocks.authenticateGoogleAuthorizationCode.mockResolvedValue(
      Ok({
        sub: "google-sub-back-2",
        email: "back1@test.local",
        name: "Back One",
      }),
    );

    const result = await completeGoogleOAuthCallback(
      request,
      ctx.repos,
      sendPrivilegedLoginAlert,
    );

    expect(isErr(result)).toBe(false);
    if (isErr(result)) {
      throw new Error("expected successful callback result");
    }
    expect(result.value.redirectPath).toBe("/onboarding");
    expect(result.value.sessionToken).toBeTruthy();

    const sessions = await ctx.repos.sessions.listForUser(identity.userId);
    expect(sessions[0]?.session_class).toBe("pre_auth");
  });

  it("returns bad_request when google exchange fails", async () => {
    mocks.authenticateGoogleAuthorizationCode.mockResolvedValue(
      Err({ kind: "invalid_google_callback" }),
    );

    const result = await completeGoogleOAuthCallback(
      request,
      ctx.repos,
      sendPrivilegedLoginAlert,
    );

    expect(isErr(result)).toBe(true);
    if (!isErr(result)) {
      throw new Error("expected bad_request result");
    }
    expect(result.error).toEqual({ kind: "bad_request" });
  });
});
