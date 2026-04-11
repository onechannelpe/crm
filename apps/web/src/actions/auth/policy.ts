"use server";

import { getOnboardingRequirements as getOnboardingRequirementsQuery } from "~/server/auth/application/queries/get-onboarding-requirements";
import type { OnboardingRequirements } from "~/server/auth/policy/types";
import { serverRuntime } from "~/server/runtime";
import { runAction } from "~/server/shared/action-runtime";

export async function getOnboardingRequirements(): Promise<OnboardingRequirements> {
  return runAction({
    actionName: "auth.policy.onboarding_requirements",
    access: { kind: "session" },
    execute: (ctx) =>
      getOnboardingRequirementsQuery(ctx, serverRuntime.auth.sessionRead),
  });
}
