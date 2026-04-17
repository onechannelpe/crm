import {
  getStrongAuthStatus,
  requiresStrongAuthRole,
} from "~/lib/auth/security/strong-auth-status";
import type { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import type { createNotificationContactRepo } from "~/server/notifications/repos/contact";
import type { createNotificationPreferenceRepo } from "~/server/notifications/repos/preference";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";
import type { createPasskeysRepo } from "~/server/users/repos-passkeys";
import type { createUsersRepo } from "~/server/users/repos-users";

import { bootstrapUserNotifications } from "./service-user-notification-bootstrap";

type OnboardingRepos = {
  users: ReturnType<typeof createUsersRepo>;
  passkeys: ReturnType<typeof createPasskeysRepo>;
  userTotpFactors: ReturnType<typeof createUserTotpFactorsRepo>;
  notificationContacts: ReturnType<typeof createNotificationContactRepo>;
  notificationPreferences: ReturnType<typeof createNotificationPreferenceRepo>;
};

export type CompleteOnboardingError =
  | { kind: "not_found"; code: "user_not_found"; message: string }
  | { kind: "conflict"; code: "strong_auth_required"; message: string }
  | { kind: "unexpected"; code: "unexpected"; message: string };

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
        kind: "not_found",
        code: "user_not_found",
        message: "User not found",
      });
    }

    if (user.onboarding_completed_at !== null) {
      return Ok(undefined);
    }

    const strongAuthStatus = await getStrongAuthStatus(input.userId, repos);
    if (
      requiresStrongAuthRole(user.role) &&
      !strongAuthStatus.hasVerifiedStrongAuth
    ) {
      return Err({
        kind: "conflict",
        code: "strong_auth_required",
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
      kind: "unexpected",
      code: "unexpected",
      message: "Unexpected onboarding completion failure",
    });
  }
}
