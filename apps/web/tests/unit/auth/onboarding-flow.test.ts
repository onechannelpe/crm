import { describe, expect, it } from "vitest";

import type { OnboardingSnapshot } from "~/contracts/auth";
import { resolveOnboardingStep } from "~/features/onboarding/model/resolve-step";

function createSnapshot(
  overrides?: Partial<OnboardingSnapshot>,
): OnboardingSnapshot {
  return {
    user: {
      email: "user@example.com",
      names: "Test",
      firstSurname: "User",
      secondSurname: "Example",
      role: "executive",
      phone: null,
    },
    passwordChangeRequired: false,
    strongAuthRequired: false,
    hasPasskey: false,
    totpEnabled: false,
    ...overrides,
  };
}

describe("onboarding flow", () => {
  it("requires replacing the installation password first", () => {
    const snapshot = createSnapshot({ passwordChangeRequired: true });

    expect(resolveOnboardingStep(snapshot, null)).toBe("password");
  });

  it("requires the profile before security enrollment", () => {
    expect(resolveOnboardingStep(createSnapshot(), "passkey")).toBe("profile");
  });

  it("shows security choices after the profile is complete", () => {
    const snapshot = createSnapshot({
      user: { ...createSnapshot().user, phone: "999888777" },
    });

    expect(resolveOnboardingStep(snapshot, null)).toBe("security");
  });

  it("opens optional passkey enrollment when requested", () => {
    const snapshot = createSnapshot({
      user: { ...createSnapshot().user, phone: "999888777" },
    });

    expect(resolveOnboardingStep(snapshot, "passkey")).toBe("passkey");
  });

  it("opens optional totp enrollment when requested", () => {
    const snapshot = createSnapshot({
      user: { ...createSnapshot().user, phone: "999888777" },
    });

    expect(resolveOnboardingStep(snapshot, "totp")).toBe("totp");
  });
});
