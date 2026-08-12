import { query } from "@solidjs/router";

import { getOnboardingSnapshot } from "~/server/auth/ui/onboarding";

export const onboardingSnapshotQuery = query(async () => {
  "use server";
  return getOnboardingSnapshot();
}, "auth.onboarding.snapshot");
