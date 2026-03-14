import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import type { Repositories } from "~/server/shared/registry";
import { Err, type Result } from "~/server/shared/result";
import {
  completeAccountOnboardingWithRepos,
  type CompleteOnboardingError,
} from "~/server/users/service-account-onboarding";

import {
  finishPasskeyRegistrationFlow,
} from "./registration-flow";
import { createPasskeyService } from "./passkey";

type PasskeyOnboardingRepos = Pick<
  Repositories,
  | "users"
  | "passkeys"
  | "userTotpFactors"
  | "notificationContacts"
  | "notificationPreferences"
  | "webauthnChallenges"
  | "auditLogs"
  | "authThrottle"
>;

export type CompletePasskeyOnboardingError =
  | { reason: "invalid_request"; message: string }
  | CompleteOnboardingError;

interface CompletePasskeyOnboardingInput {
  userId: number;
  challengeId: number;
  response: RegistrationResponseJSON;
  ipAddress: string;
  phoneE164: string;
}

interface PasskeyOnboardingDeps {
  runInTransaction?: <T>(
    operation: (repos: PasskeyOnboardingRepos) => Promise<T>,
  ) => Promise<T>;
  createPasskeyService?: (
    repos: Pick<Repositories, "passkeys" | "auditLogs">,
  ) => ReturnType<typeof createPasskeyService>;
}

export function createPasskeyOnboardingService(
  repos: PasskeyOnboardingRepos,
  deps: PasskeyOnboardingDeps = {},
) {
  const runInTransaction =
    deps.runInTransaction ??
    (async <T>(operation: (transactionRepos: PasskeyOnboardingRepos) => Promise<T>) =>
      operation(repos));
  const createPasskeyServiceForRepos =
    deps.createPasskeyService ?? createPasskeyService;

  return {
    async complete(
      input: CompletePasskeyOnboardingInput,
    ): Promise<Result<void, CompletePasskeyOnboardingError>> {
      try {
        return await runInTransaction(async (transactionRepos) => {
          try {
            await finishPasskeyRegistrationFlow(
              input.userId,
              input.challengeId,
              input.response,
              input.ipAddress,
              transactionRepos,
              createPasskeyServiceForRepos(transactionRepos),
            );
          } catch {
            return Err({
              reason: "invalid_request",
              message: "Invalid passkey request",
            });
          }

          return completeAccountOnboardingWithRepos(transactionRepos, {
            userId: input.userId,
            phoneE164: input.phoneE164,
          });
        });
      } catch {
        return Err({
          reason: "unexpected",
          message: "Unexpected onboarding completion failure",
        });
      }
    },
  };
}
