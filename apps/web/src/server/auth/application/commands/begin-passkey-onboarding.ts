import { createPasskeyEnrollmentAuthService } from "~/server/auth/passkey/service";
import type { PasskeyWebauthnProviderFactory } from "~/server/auth/passkey/service";
import type { UserId, LeadId, BranchId } from "~/server/shared/ids";

import type { AuthOnboardingRepos } from "../../infrastructure/onboarding-context";

function createEnrollmentService(
  repos: AuthOnboardingRepos,
  input: {
    createWebauthnProvider: PasskeyWebauthnProviderFactory;
  },
) {
  return createPasskeyEnrollmentAuthService(repos, {
    createWebauthnProvider: input.createWebauthnProvider,
  });
}

export function beginPasskeyOnboarding(
  repos: AuthOnboardingRepos,
  input: {
    userId: UserId;
    ipAddress: string;
    createWebauthnProvider: PasskeyWebauthnProviderFactory;
  },
) {
  return createEnrollmentService(repos, input).beginEnrollment({
    userId: input.userId,
    ipAddress: input.ipAddress,
  });
}
