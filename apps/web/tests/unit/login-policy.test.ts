import { describe, expect, it } from "vitest";

import { evaluateLoginPolicy } from "../../src/lib/auth/policy/login-policy";

describe("login policy", () => {
  it("denies onboarded privileged google login when no strong factor is enrolled", () => {
    const decision = evaluateLoginPolicy({
      proof: {
        kind: "google",
        userId: 1,
        trustedFederatedMfa: false,
      },
      context: {
        user: {
          role: "admin",
          onboarding_completed_at: 1_710_000_000_000,
        },
        strongAuthStatus: {
          hasTotp: false,
          hasPasskey: false,
          passkeyCount: 0,
          hasVerifiedStrongAuth: false,
        },
      },
    });

    expect(decision).toEqual({
      kind: "deny",
      reason: "strong_auth_required",
    });
  });

  it("requires totp step-up for onboarded privileged google login when totp is enrolled", () => {
    const decision = evaluateLoginPolicy({
      proof: {
        kind: "google",
        userId: 1,
        trustedFederatedMfa: false,
      },
      context: {
        user: {
          role: "admin",
          onboarding_completed_at: 1_710_000_000_000,
        },
        strongAuthStatus: {
          hasTotp: true,
          hasPasskey: false,
          passkeyCount: 0,
          hasVerifiedStrongAuth: true,
        },
      },
    });

    expect(decision).toEqual({
      kind: "require_totp",
    });
  });

  it("issues only a pre-auth session for privileged onboarding bootstrap login", () => {
    const decision = evaluateLoginPolicy({
      proof: {
        kind: "password",
        userId: 1,
      },
      context: {
        user: {
          role: "admin",
          onboarding_completed_at: null,
        },
        strongAuthStatus: {
          hasTotp: false,
          hasPasskey: false,
          passkeyCount: 0,
          hasVerifiedStrongAuth: false,
        },
      },
    });

    expect(decision).toEqual({
      kind: "issue_session",
      sessionClass: "pre_auth",
      strongAuthMethod: null,
      strongAuthAt: null,
    });
  });
});
