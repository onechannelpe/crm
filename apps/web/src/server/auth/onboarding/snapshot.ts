import type { OnboardingSnapshot } from "~/contracts/auth";
import { fail, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { requiresStrongAuthRole } from "~/server/auth/policy/rules/role";
import { getStrongAuthStatus } from "~/server/auth/security/strong-auth-status";
import { Err, Ok, type Result } from "~/shared/result";

import type { AuthSetupRepos } from "../infrastructure/setup-context";

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
    passwordChangeRequired: user.password_change_required,
    strongAuthRequired: requiresStrongAuthRole(user.role),
    hasPasskey: strongAuth.hasPasskey,
    totpEnabled: strongAuth.hasTotp,
  });
}
