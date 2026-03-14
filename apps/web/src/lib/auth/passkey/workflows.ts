import type { RegistrationResponseJSON } from "@simplewebauthn/server";

import type { Repositories } from "~/server/shared/registry";
import { Err, type Result } from "~/server/shared/result";
import {
  completeAccountOnboardingWithRepos,
  type CompleteOnboardingError,
} from "~/server/users/service-account-onboarding";

import { createPasskeyService } from "./passkey";
import {
  beginPasskeyRegistrationFlow,
  finishPasskeyRegistrationFlow,
} from "./registration-flow";

type PasskeyWorkflowRepos = Pick<
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

interface PasskeyWorkflowDeps {
  runInTransaction?: <T>(
    operation: (repos: PasskeyWorkflowRepos) => Promise<T>,
  ) => Promise<T>;
  createPasskeyService?: (
    repos: Pick<Repositories, "passkeys" | "auditLogs">,
  ) => ReturnType<typeof createPasskeyService>;
}

interface BeginPasskeyEnrollmentInput {
  userId: number;
  ipAddress: string;
}

interface FinishPasskeyEnrollmentInput extends BeginPasskeyEnrollmentInput {
  challengeId: number;
  response: RegistrationResponseJSON;
}

interface CompletePasskeyOnboardingInput extends FinishPasskeyEnrollmentInput {
  phoneE164: string;
}

export function createPasskeyWorkflowService(
  repos: PasskeyWorkflowRepos,
  deps: PasskeyWorkflowDeps = {},
) {
  const runInTransaction =
    deps.runInTransaction ??
    (async <T>(
      operation: (transactionRepos: PasskeyWorkflowRepos) => Promise<T>,
    ) => operation(repos));
  const createPasskeyServiceForRepos =
    deps.createPasskeyService ?? createPasskeyService;

  return {
    async beginEnrollment(input: BeginPasskeyEnrollmentInput) {
      return beginPasskeyRegistrationFlow(
        input.userId,
        input.ipAddress,
        repos,
        createPasskeyServiceForRepos(repos),
      );
    },

    async finishEnrollment(input: FinishPasskeyEnrollmentInput): Promise<void> {
      await finishPasskeyRegistrationFlow(
        input.userId,
        input.challengeId,
        input.response,
        input.ipAddress,
        repos,
        createPasskeyServiceForRepos(repos),
      );
    },

    async completeOnboarding(
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
