import { describe, expect, it } from "vitest";

import { getDefaultAppPath } from "~/lib/auth/access/route-policy";
import { deriveOnboardingRequirements } from "~/server/auth/policy/engine";

type OnboardingUser = Parameters<typeof deriveOnboardingRequirements>[0];

function createUser(overrides?: Partial<OnboardingUser>): OnboardingUser {
  return {
    phone: null,
    strongAuthConfigured: false,
    onboardingCompletedAt: null,
    passwordChangeRequired: false,
    role: "executive",
    ...overrides,
  };
}

describe("onboarding flow", () => {
  it("requires replacing the installation password before other onboarding steps", () => {
    const requirements = deriveOnboardingRequirements(
      createUser({ passwordChangeRequired: true }),
    );

    expect(requirements.sessionState).toBe("onboarding_password");
    expect(requirements.requiredActions).toEqual([
      "change_password",
      "set_profile",
    ]);
    expect(requirements.reasons).toEqual([
      "installation_password_change_required",
      "phone_required",
    ]);
    expect(requirements.canAccessApp).toBe(false);
  });

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
        phone: "999888777",
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
        phone: null,
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
        phone: "999888777",
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
        phone: "999888777",
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
