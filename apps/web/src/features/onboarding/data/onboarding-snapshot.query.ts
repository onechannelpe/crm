import { query } from "@solidjs/router";

export const onboardingSnapshotQuery = query(async () => {
  "use server";

  const { getOnboardingSnapshot } =
    await import("~/actions/auth/onboarding/snapshot.action");
  return getOnboardingSnapshot();
}, "auth.onboarding.snapshot");
