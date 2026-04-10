import { describe, expect, it } from "vitest";

import { deriveOnboardingRequirements } from "../../src/server/auth/policy/engine";

describe("onboarding flow", () => {
  it("requires only profile for executive users without security setup", () => {
    const requirements = deriveOnboardingRequirements({
      phoneE164: null,
      strongAuthRequired: false,
      strongAuthConfigured: false,
      onboardingCompletedAt: null,
      role: "executive",
    });

    expect(requirements.requiredActions).toEqual(["set_profile"]);
    expect(requirements.optionalActions).toEqual([
      "configure_passkey",
      "configure_totp",
    ]);
    expect(requirements.canAccessApp).toBe(false);
  });

  it("requires strong auth setup for admin users with phone present", () => {
    const requirements = deriveOnboardingRequirements({
      phoneE164: "+51999888777",
      strongAuthRequired: true,
      strongAuthConfigured: false,
      onboardingCompletedAt: null,
      role: "admin",
    });

    expect(requirements.requiredActions).toEqual(["configure_strong_auth"]);
    expect(requirements.canAccessApp).toBe(false);
    expect(requirements.nextRoute).toBe("/onboarding");
  });

  it("allows app access once requirements are satisfied", () => {
    const requirements = deriveOnboardingRequirements({
      phoneE164: "+51999888777",
      strongAuthRequired: true,
      strongAuthConfigured: true,
      onboardingCompletedAt: 1_710_000_000_000,
      role: "admin",
    });

    expect(requirements.requiredActions).toEqual([]);
    expect(requirements.canAccessApp).toBe(true);
    expect(requirements.nextRoute).toBe("/admin");
  });
});
