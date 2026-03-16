import type { Role } from "~/lib/auth/access/rbac";
import {
  getStrongAuthStatus,
  requiresStrongAuthRole,
} from "~/lib/auth/security/strong-auth-status";
import type { UserId } from "~/server/shared/ids";
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
  userId: UserId;
  phoneE164: string;
}

export interface AccountOnboardingDeps {
  now?: () => number;
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

    const strongAuthStatus = await getStrongAuthStatus(input.userId, repos);
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
