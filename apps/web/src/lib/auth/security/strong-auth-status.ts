import type { UsersTable } from "~/lib/db/types";
import type { UserId } from "~/server/shared/ids";

export interface StrongAuthPasskeysPort {
  findByUser(userId: UserId): Promise<Array<unknown>>;
}

export interface StrongAuthTotpFactorsPort {
  findByUserId(
    userId: UserId,
  ): Promise<{ is_enabled: number } | null | undefined>;
}

export interface StrongAuthRepos {
  passkeys: StrongAuthPasskeysPort;
  userTotpFactors: StrongAuthTotpFactorsPort;
}

export interface StrongAuthStatus {
  hasTotp: boolean;
  hasPasskey: boolean;
  passkeyCount: number;
  hasVerifiedStrongAuth: boolean;
}

export function deriveStrongAuthRequired(role: UsersTable["role"]): boolean {
  return STRONG_AUTH_ROLES.some((item) => item === role);
}

const STRONG_AUTH_ROLES = ["sales_manager", "admin", "superuser"] as const;

export function requiresStrongAuthRole(role: UsersTable["role"]) {
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
