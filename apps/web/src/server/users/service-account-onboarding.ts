import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";
import type { Phone } from "~/lib/phone/pe-mobile";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";
import type { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import type { createNotificationPreferenceRepo } from "~/server/notifications/repos/preference";
import type { createUserChannelAddressRepo } from "~/server/notifications/repos/user-channel-address";
import { fail, type DomainError } from "~/server/shared/domain-error";
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

export interface CompleteOnboardingInput {
  userId: UserId;
  phone: Phone;
}

export interface AccountOnboardingDeps {
  now?: () => Date;
}

export async function completeAccountOnboardingWithRepos(
  repos: OnboardingRepos,
  input: CompleteOnboardingInput,
  deps: Pick<AccountOnboardingDeps, "now"> = {},
): Promise<Result<void, DomainError>> {
  const now = deps.now ?? (() => new Date());

  const user = await repos.users.findById(input.userId);
  if (!user) {
    return Err(fail("user_not_found"));
  }

  if (user.onboarding_completed_at !== null) {
    return Ok(undefined);
  }

  const strongAuthStatus = await getStrongAuthStatus(input.userId, repos);
  if (
    requiresStrongAuthRole(user.role) &&
    !strongAuthStatus.hasVerifiedStrongAuth
  ) {
    return Err(fail("strong_auth_required"));
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
    return Err(fail("phone_in_use"));
  }

  await repos.users.completeOnboarding(user.id, { completedAt });
  return Ok(undefined);
}
