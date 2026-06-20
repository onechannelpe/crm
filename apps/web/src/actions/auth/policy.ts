"use server";

import { getOnboardingRequirements as getOnboardingRequirementsQuery } from "~/server/auth/application/queries/get-onboarding-requirements";
import type { OnboardingRequirements } from "~/server/auth/policy/types";
import { runAction } from "~/server/platform/action";
import { getServerRuntime } from "~/server/platform/container";

export async function getOnboardingRequirements(): Promise<OnboardingRequirements> {
  return runAction({
    name: "auth.policy.onboarding_requirements",
    access: { kind: "session" },
    execute: (ctx) =>
      getOnboardingRequirementsQuery(ctx, getServerRuntime().auth.sessionRead),
  });
}
