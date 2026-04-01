import { repos, runInRepositoryTransaction } from "~/server/shared/context";

export function createAuthOnboardingContext() {
  return {
    repos,
    runInRepositoryTransaction,
  };
}

export type AuthOnboardingContext = ReturnType<
  typeof createAuthOnboardingContext
>;
