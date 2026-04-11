import { describe, expect, it } from "vitest";

import { getDefaultAppPath } from "../../src/lib/auth/access/route-policy";
import { deriveOnboardingRequirements } from "../../src/server/auth/policy/engine";

type OnboardingUser = Parameters<typeof deriveOnboardingRequirements>[0];

function createUser(overrides?: Partial<OnboardingUser>): OnboardingUser {
  return {
    phoneE164: null,
    strongAuthConfigured: false,
    onboardingCompletedAt: null,
    role: "executive",
    ...overrides,
  };
}

describe("onboarding flow", () => {
  it("requires only profile for executive users without security setup", () => {
    const requirements = deriveOnboardingRequirements(createUser());

    expect(requirements.requiredActions).toEqual(["set_profile"]);
    expect(requirements.optionalActions).toEqual([
      "configure_passkey",
      "configure_totp",
    ]);
    expect(requirements.reasons).toEqual(["phone_required"]);
    expect(requirements.canAccessApp).toBe(false);
  });

  it("requires strong auth setup for admin users with phone present", () => {
    const requirements = deriveOnboardingRequirements(
      createUser({
        role: "admin",
        phoneE164: "+51999888777",
      }),
    );

    expect(requirements.requiredActions).toEqual(["configure_strong_auth"]);
    expect(requirements.optionalActions).toEqual([]);
    expect(requirements.reasons).toEqual(["strong_auth_required"]);
    expect(requirements.canAccessApp).toBe(false);
    expect(requirements.nextRoute).toBe("/onboarding");
  });

  it("requires profile and strong auth for admin users missing both", () => {
    const requirements = deriveOnboardingRequirements(
      createUser({
        role: "admin",
        phoneE164: null,
      }),
    );

    expect(requirements.requiredActions).toEqual([
      "set_profile",
      "configure_strong_auth",
    ]);
    expect(requirements.reasons).toEqual([
      "phone_required",
      "strong_auth_required",
    ]);
    expect(requirements.canAccessApp).toBe(false);
  });

  it("allows app access once requirements are satisfied", () => {
    const requirements = deriveOnboardingRequirements(
      createUser({
        role: "admin",
        phoneE164: "+51999888777",
        strongAuthConfigured: true,
        onboardingCompletedAt: 1_710_000_000_000,
      }),
    );

    expect(requirements.requiredActions).toEqual([]);
    expect(requirements.reasons).toEqual([]);
    expect(requirements.canAccessApp).toBe(true);
    expect(requirements.nextRoute).toBe(getDefaultAppPath("admin"));
  });

  it("allows executive users without strong auth when profile is complete", () => {
    const requirements = deriveOnboardingRequirements(
      createUser({
        phoneE164: "+51999888777",
        onboardingCompletedAt: 1_710_000_000_000,
      }),
    );

    expect(requirements.requiredActions).toEqual([]);
    expect(requirements.optionalActions).toEqual([
      "configure_passkey",
      "configure_totp",
    ]);
    expect(requirements.canAccessApp).toBe(true);
    expect(requirements.nextRoute).toBe(getDefaultAppPath("executive"));
  });
});
