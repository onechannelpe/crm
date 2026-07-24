import { query } from "@solidjs/router";

import { getOnboardingSnapshot } from "~/actions/auth/onboarding/snapshot";

export const onboardingSnapshotQuery = query(
  getOnboardingSnapshot,
  "auth.onboarding.snapshot",
);
