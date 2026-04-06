import type { User } from "~/lib/db/types";
import type { createUserTotpFactorsRepo } from "~/server/auth/repos-user-totp-factors";
import type { UserId } from "~/server/shared/ids";
import type { createPasskeysRepo } from "~/server/users/repos-passkeys";

type StrongAuthRepos = {
  passkeys: ReturnType<typeof createPasskeysRepo>;
  userTotpFactors: ReturnType<typeof createUserTotpFactorsRepo>;
};

export interface StrongAuthStatus {
  hasTotp: boolean;
  hasPasskey: boolean;
  passkeyCount: number;
  hasVerifiedStrongAuth: boolean;
}

export function deriveStrongAuthRequired(role: User["role"]): boolean {
  return STRONG_AUTH_ROLES.some((item) => item === role);
}

const STRONG_AUTH_ROLES = ["sales_manager", "admin", "superuser"] as const;

export function requiresStrongAuthRole(role: User["role"]) {
  return deriveStrongAuthRequired(role);
}

export async function getStrongAuthStatus(
  userId: UserId,
  repos: StrongAuthRepos,
): Promise<StrongAuthStatus> {
  const [totpFactor, passkeys] = await Promise.all([
    repos.userTotpFactors.findByUserId(userId),
    repos.passkeys.findByUser(userId),
  ]);

  const hasTotp = totpFactor?.is_enabled === 1;
  const passkeyCount = passkeys.length;
  const hasPasskey = passkeyCount > 0;

  return {
    hasTotp,
    hasPasskey,
    passkeyCount,
    hasVerifiedStrongAuth: hasTotp || hasPasskey,
  };
}
