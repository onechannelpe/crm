import type { Role } from "~/lib/auth/access/rbac";
import {
  getStrongAuthStatus,
  requiresStrongAuthRole,
} from "~/lib/auth/security/strong-auth-status";
import type { Repositories } from "~/server/shared/registry";
import { Err, Ok, type Result } from "~/server/shared/result";

import { bootstrapUserNotifications } from "./service-user-notification-bootstrap";

type OnboardingRepos = Pick<
  Repositories,
  | "users"
  | "passkeys"
  | "userTotpFactors"
  | "notificationContacts"
  | "notificationPreferences"
>;

export type CompleteOnboardingError =
  | { reason: "user_not_found"; message: string }
  | { reason: "strong_auth_required"; message: string }
  | { reason: "unexpected"; message: string };

export interface CompleteOnboardingInput {
  userId: number;
  phoneE164: string;
}

export interface AccountOnboardingDeps {
  now?: () => number;
  runInTransaction?: <T>(
    operation: (repos: OnboardingRepos) => Promise<T>,
  ) => Promise<T>;
}

export async function completeAccountOnboardingWithRepos(
  repos: OnboardingRepos,
  input: CompleteOnboardingInput,
  deps: Pick<AccountOnboardingDeps, "now"> = {},
): Promise<Result<void, CompleteOnboardingError>> {
  const now = deps.now ?? Date.now;

  try {
    const user = await repos.users.findById(input.userId);
    if (!user) {
      return Err({
        reason: "user_not_found",
        message: "User not found",
      });
    }

    if (user.onboarding_completed_at !== null) {
      return Ok(undefined);
    }

    const strongAuthStatus = await getStrongAuthStatus(user.id, repos);
    if (
      requiresStrongAuthRole(user.role as Role) &&
      !strongAuthStatus.hasVerifiedStrongAuth
    ) {
      return Err({
        reason: "strong_auth_required",
        message: "Strong authentication setup required",
      });
    }

    const completedAt = now();
    await repos.users.completeOnboarding(user.id, {
      phone_e164: input.phoneE164,
      completedAt,
    });
    await bootstrapUserNotifications(
      {
        userId: user.id,
        email: user.email,
        phoneE164: input.phoneE164,
        now: completedAt,
      },
      repos,
    );
    return Ok(undefined);
  } catch {
    return Err({
      reason: "unexpected",
      message: "Unexpected onboarding completion failure",
    });
  }
}

export function createAccountOnboardingService(
  repos: OnboardingRepos,
  deps: AccountOnboardingDeps = {},
) {
  const now = deps.now ?? Date.now;
  const runInTransaction =
    deps.runInTransaction ??
    (async <T>(operation: (transactionRepos: OnboardingRepos) => Promise<T>) =>
      operation(repos));

  return {
    async completeOnboarding(
      input: CompleteOnboardingInput,
    ): Promise<Result<void, CompleteOnboardingError>> {
      return runInTransaction((transactionRepos) =>
        completeAccountOnboardingWithRepos(transactionRepos, input, { now }),
      );
    },
  };
}
