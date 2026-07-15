import type { Role } from "~/lib/auth/access/rbac";
import { getStrongAuthStatus } from "~/lib/auth/security/strong-auth-status";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";
import { fail, type DomainError } from "~/server/shared/domain-error";
import type { UserId } from "~/server/shared/ids";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { AuthSetupRepos } from "../infrastructure/setup-context";

export interface OnboardingSnapshot {
  user: {
    email: string;
    names: string;
    firstSurname: string;
    secondSurname: string;
    role: Role;
    phone: string | null;
  };
  onboardingCompleted: boolean;
  passwordChangeRequired: boolean;
  strongAuthRequired: boolean;
  hasPasskey: boolean;
  totpEnabled: boolean;
}

export async function loadOnboardingSnapshot(
  repos: AuthSetupRepos,
  userId: UserId,
): Promise<Result<OnboardingSnapshot, DomainError>> {
  const [user, phoneAddress, strongAuth] = await Promise.all([
    repos.users.findById(userId),
    repos.userChannelAddresses.findByUserAndChannel(userId, "whatsapp"),
    getStrongAuthStatus(userId, repos),
  ]);
  if (!user) {
    return Err(fail("user_not_found"));
  }

  return Ok({
    user: {
      email: user.email,
      names: user.names,
      firstSurname: user.first_surname,
      secondSurname: user.second_surname,
      role: user.role,
      phone: phoneAddress?.address ?? null,
    },
    onboardingCompleted: user.onboarding_completed_at !== null,
    passwordChangeRequired: user.password_change_required,
    strongAuthRequired: requiresStrongAuthRole(user.role),
    hasPasskey: strongAuth.hasPasskey,
    totpEnabled: strongAuth.hasTotp,
  });
}
