import {
  getStrongAuthStatus,
  requiresStrongAuthRole,
} from "~/lib/auth/security/strong-auth-status";
import type { Phone } from "~/lib/phone/pe-mobile";
import type { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import type { createNotificationPreferenceRepo } from "~/server/notifications/repos/preference";
import type { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import type { UserId } from "~/server/shared/ids";
import { Err, isErr, Ok, type Result } from "~/server/shared/result";
import type { createPasskeysRepo } from "~/server/users/repos-passkeys";
import type { createUsersRepo } from "~/server/users/repos-users";

import { bootstrapUserNotifications } from "./service-user-notification-bootstrap";

type OnboardingRepos = {
  users: ReturnType<typeof createUsersRepo>;
  passkeys: ReturnType<typeof createPasskeysRepo>;
  userTotpFactors: ReturnType<typeof createUserTotpFactorsRepo>;
  userChannelAddresses: ReturnType<typeof createUserChannelAddressRepo>;
  notificationPreferences: ReturnType<typeof createNotificationPreferenceRepo>;
};

export type CompleteOnboardingError =
  | { kind: "not_found"; code: "user_not_found"; message: string }
  | { kind: "conflict"; code: "strong_auth_required"; message: string }
  | { kind: "conflict"; code: "address_already_claimed"; message: string }
  | { kind: "unexpected"; code: "unexpected"; message: string };

export interface CompleteOnboardingInput {
  userId: UserId;
  phone: Phone;
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
  const bootstrapResult = await bootstrapUserNotifications(
    {
      userId: user.id,
      email: user.email,
      phone: input.phone,
      now: completedAt,
    },
    repos,
  );
  if (isErr(bootstrapResult)) {
    return Err({
      kind: "conflict",
      code: "address_already_claimed",
      message: "Este número de WhatsApp ya está en uso",
    });
  }

  await repos.users.completeOnboarding(user.id, { completedAt });
  return Ok(undefined);
}
