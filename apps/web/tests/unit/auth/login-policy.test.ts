import { describe, expect, it } from "vitest";

import {
  evaluateLoginPolicy,
  type LoginPolicyInput,
} from "~/server/auth/policy/engine";
import { UserId } from "~/server/shared/ids";

function createInput(overrides?: {
  proof?: LoginPolicyInput["proof"];
  user?: LoginPolicyInput["context"]["user"];
  strongAuthStatus?: LoginPolicyInput["context"]["strongAuthStatus"];
  recoveryCodesAcknowledgementRequired?: boolean;
}): LoginPolicyInput {
  return {
    proof: overrides?.proof ?? {
      kind: "google",
      userId: UserId.trust("1"),
      trustedFederatedMfa: false,
    },
    context: {
      user: overrides?.user ?? {
        role: "admin",
        onboarding_completed_at: new Date(1_710_000_000_000),
      },
      strongAuthStatus: overrides?.strongAuthStatus ?? {
        hasTotp: false,
        hasPasskey: false,
        hasVerifiedStrongAuth: false,
      },
      recoveryCodesAcknowledgementRequired:
        overrides?.recoveryCodesAcknowledgementRequired ?? false,
    },
  };
}

describe("login policy", () => {
  it("denies onboarded privileged google login when no strong factor is enrolled", () => {
    const decision = evaluateLoginPolicy(createInput());

    expect(decision).toEqual({
      kind: "deny",
      reason: "strong_auth_required",
    });
  });

  it("requires totp step-up for onboarded privileged google login when totp is enrolled", () => {
    const decision = evaluateLoginPolicy(
      createInput({
        strongAuthStatus: {
          hasTotp: true,
          hasPasskey: false,
          hasVerifiedStrongAuth: true,
        },
      }),
    );

    expect(decision).toEqual({
      kind: "require_totp",
    });
  });

  it("requires passkey step-up when passkey is enrolled without totp", () => {
    const decision = evaluateLoginPolicy(
      createInput({
        strongAuthStatus: {
          hasTotp: false,
          hasPasskey: true,
          hasVerifiedStrongAuth: true,
        },
      }),
    );

    expect(decision).toEqual({
      kind: "require_passkey",
    });
  });

  it("denies when totp or passkey flags are inconsistent with verified status", () => {
    const decision = evaluateLoginPolicy(
      createInput({
        strongAuthStatus: {
          hasTotp: true,
          hasPasskey: false,
          hasVerifiedStrongAuth: false,
        },
      }),
    );

    expect(decision).toEqual({
      kind: "deny",
      reason: "strong_auth_required",
    });
  });

  it("issues session directly when provider proof includes trusted federated mfa", () => {
    const decision = evaluateLoginPolicy(
      createInput({
        proof: {
          kind: "google",
          userId: UserId.trust("1"),
          trustedFederatedMfa: true,
        },
      }),
    );

    expect(decision).toEqual({
      kind: "issue_session",
      sessionClass: "app",
      strongAuthMethod: "federated",
      strongAuthAt: expect.any(Date),
    });
  });

  it("issues only a pre-auth session for privileged onboarding bootstrap login", () => {
    const decision = evaluateLoginPolicy(
      createInput({
        proof: {
          kind: "password",
          userId: UserId.trust("1"),
        },
        user: {
          role: "admin",
          onboarding_completed_at: null,
        },
      }),
    );

    expect(decision).toEqual({
      kind: "issue_session",
      sessionClass: "pre_auth",
      strongAuthMethod: null,
      strongAuthAt: null,
    });
  });

  it("issues a recovery-setup session while recovery codes are unacknowledged", () => {
    const decision = evaluateLoginPolicy(
      createInput({
        proof: {
          kind: "password",
          userId: UserId.trust("1"),
        },
        user: {
          role: "executive",
          onboarding_completed_at: new Date(1_710_000_000_000),
        },
        recoveryCodesAcknowledgementRequired: true,
      }),
    );

    expect(decision).toEqual({
      kind: "issue_session",
      sessionClass: "recovery_setup",
      strongAuthMethod: null,
      strongAuthAt: null,
    });
  });
});
