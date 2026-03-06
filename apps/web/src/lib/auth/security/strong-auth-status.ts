import type { User } from "~/lib/db/schema";
import type { Repositories } from "~/server/shared/registry";

type StrongAuthRepos = Pick<Repositories, "passkeys" | "userTotpFactors">;

export interface StrongAuthStatus {
  hasTotp: boolean;
  hasPasskey: boolean;
  passkeyCount: number;
  hasVerifiedStrongAuth: boolean;
}

export function deriveStrongAuthRequired(role: User["role"]): number {
  return STRONG_AUTH_ROLES.some((item) => item === role) ? 1 : 0;
}

const STRONG_AUTH_ROLES = ["sales_manager", "admin", "superuser"] as const;

export function requiresStrongAuth(user: Pick<User, "strong_auth_required">) {
  return user.strong_auth_required === 1;
}

export async function getStrongAuthStatus(
  userId: number,
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
