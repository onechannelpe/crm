import { describe, expect, it } from "vitest";

import { deriveOnboardingState } from "../../src/lib/auth/onboarding-flow";

describe("onboarding flow", () => {
  it("allows finishing once phone and strong auth are configured", () => {
    const state = deriveOnboardingState({
      requestedStep: "security",
      phoneE164: "999888777",
      user: {
        strongAuthRequired: true,
        strongAuthConfigured: true,
      },
    });

    expect(state.canFinish).toBe(true);
    expect(state.securityReady).toBe(true);
  });

  it("blocks finishing when phone is valid but strong auth is still missing", () => {
    const state = deriveOnboardingState({
      requestedStep: "security",
      phoneE164: "999888777",
      user: {
        strongAuthRequired: true,
        strongAuthConfigured: false,
      },
    });

    expect(state.canFinish).toBe(false);
    expect(state.securityReady).toBe(false);
  });
});
