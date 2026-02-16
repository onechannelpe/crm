import type { AuthenticationResponseJSON } from "@simplewebauthn/server";

import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestEvent: vi.fn(),
  checkPasskeyChallengeThrottle: vi.fn(),
  checkPasskeyVerifyThrottle: vi.fn(),
  clearPasskeyVerifyFailureState: vi.fn(),
  recordPasskeyChallengeFailure: vi.fn(),
  recordPasskeyVerifyFailure: vi.fn(),
  getSessionCookie: vi.fn(),
  setSessionCookie: vi.fn(),
  invalidateSession: vi.fn(),
  createSession: vi.fn(),
  hashSessionToken: vi.fn(),
  getAuthenticationOptions: vi.fn(),
  verifyAuthentication: vi.fn(),
  usersFindByEmail: vi.fn(),
  usersFindById: vi.fn(),
  challengeCreate: vi.fn(),
  challengeFindById: vi.fn(),
  challengeDelete: vi.fn(),
  auditCreate: vi.fn(),
}));

vi.mock("solid-js/web", () => ({
  getRequestEvent: mocks.getRequestEvent,
}));

vi.mock("~/lib/auth/password/throttle", () => ({
  checkPasskeyChallengeThrottle: mocks.checkPasskeyChallengeThrottle,
  checkPasskeyVerifyThrottle: mocks.checkPasskeyVerifyThrottle,
  clearPasskeyVerifyFailureState: mocks.clearPasskeyVerifyFailureState,
  recordPasskeyChallengeFailure: mocks.recordPasskeyChallengeFailure,
  recordPasskeyVerifyFailure: mocks.recordPasskeyVerifyFailure,
}));

vi.mock("~/lib/auth/passkey/passkey", () => ({
  createPasskeyService: () => ({
    getAuthenticationOptions: mocks.getAuthenticationOptions,
    verifyAuthentication: mocks.verifyAuthentication,
  }),
}));

vi.mock("~/lib/auth/session/cookies", () => ({
  getSessionCookie: mocks.getSessionCookie,
  setSessionCookie: mocks.setSessionCookie,
}));

vi.mock("~/lib/auth/session/session-manager", () => ({
  invalidateSession: mocks.invalidateSession,
  createSession: mocks.createSession,
}));

vi.mock("~/lib/auth/session/tokens", () => ({
  hashSessionToken: mocks.hashSessionToken,
}));

vi.mock("~/server/shared/context", () => ({
  repos: {
    users: {
      findByEmail: mocks.usersFindByEmail,
      findById: mocks.usersFindById,
    },
    webauthnChallenges: {
      create: mocks.challengeCreate,
      findById: mocks.challengeFindById,
      delete: mocks.challengeDelete,
    },
    auditLogs: {
      create: mocks.auditCreate,
    },
  },
}));

import {
  beginPasskeyLogin,
  finishPasskeyLogin,
} from "../../src/actions/auth-passkey";

describe("passkey auth actions", () => {
  beforeEach(() => {
    for (const fn of Object.values(mocks)) {
      fn.mockReset();
    }

    mocks.getRequestEvent.mockReturnValue({
      request: new Request("http://localhost/login", {
        headers: { "cf-connecting-ip": "198.51.100.1", "user-agent": "vitest" },
      }),
    });
    mocks.checkPasskeyChallengeThrottle.mockResolvedValue({ allowed: true });
    mocks.checkPasskeyVerifyThrottle.mockResolvedValue({ allowed: true });
    mocks.recordPasskeyChallengeFailure.mockResolvedValue(undefined);
    mocks.recordPasskeyVerifyFailure.mockResolvedValue(undefined);
    mocks.clearPasskeyVerifyFailureState.mockResolvedValue(undefined);
    mocks.getAuthenticationOptions.mockResolvedValue({ challenge: "c-1" });
    mocks.challengeCreate.mockResolvedValue(99);
    mocks.getSessionCookie.mockReturnValue(null);
    mocks.createSession.mockResolvedValue("session-token");
    mocks.auditCreate.mockResolvedValue(undefined);
  });

  it("creates passkey auth challenge for active user", async () => {
    mocks.usersFindByEmail.mockResolvedValue({
      id: 7,
      branch_id: 2,
      role: "executive",
      is_active: 1,
    });

    const result = await beginPasskeyLogin("exec@test.local");

    expect(mocks.getAuthenticationOptions).toHaveBeenCalledWith(7);
    expect(mocks.challengeCreate).toHaveBeenCalledTimes(1);
    expect(result.challengeId).toBe(99);
  });

  it("consumes challenge and rejects when passkey verify fails", async () => {
    mocks.challengeFindById.mockResolvedValue({
      id: 99,
      user_id: 7,
      type: "authentication",
      challenge: "c-1",
      expires_at: Date.now() + 1000,
      created_at: Date.now(),
    });
    mocks.verifyAuthentication.mockRejectedValue(new Error("bad"));

    const response: AuthenticationResponseJSON = {
      id: "cred-1",
      rawId: "cred-1",
      type: "public-key",
      clientExtensionResults: {},
      response: {
        authenticatorData: "data",
        clientDataJSON: "client",
        signature: "sig",
      },
    };

    await expect(finishPasskeyLogin(99, response)).rejects.toThrow(
      "Invalid credentials",
    );

    expect(mocks.challengeDelete).toHaveBeenCalledWith(99);
    expect(mocks.recordPasskeyVerifyFailure).toHaveBeenCalled();
    expect(mocks.setSessionCookie).not.toHaveBeenCalled();
  });
});
