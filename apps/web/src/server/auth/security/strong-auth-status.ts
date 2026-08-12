import type { UserId } from "~/domain/ids";

export interface StrongAuthPasskeysPort {
  findByUser(userId: UserId): Promise<Array<unknown>>;
}

export interface StrongAuthTotpFactorsPort {
  findByUserId(
    userId: UserId,
  ): Promise<{ is_enabled: boolean } | null | undefined>;
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

export async function getStrongAuthStatus(
  userId: UserId,
  repos: StrongAuthRepos,
): Promise<StrongAuthStatus> {
  const [totpFactor, passkeys] = await Promise.all([
    repos.userTotpFactors.findByUserId(userId),
    repos.passkeys.findByUser(userId),
  ]);

  const hasTotp = totpFactor?.is_enabled === true;
  const passkeyCount = passkeys.length;
  const hasPasskey = passkeyCount > 0;

  return {
    hasTotp,
    hasPasskey,
    passkeyCount,
    hasVerifiedStrongAuth: hasTotp || hasPasskey,
  };
}
