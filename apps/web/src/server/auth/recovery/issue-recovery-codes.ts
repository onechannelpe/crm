import {
  generateRecoveryCodes,
  hashRecoveryCode,
} from "~/lib/auth/recovery/recovery-codes";
import type { UserRecoveryCodesRepo } from "~/server/auth/repos-user-recovery-codes";
import type { UserId } from "~/server/shared/ids";

type Repos = { userRecoveryCodes: UserRecoveryCodesRepo };

// Preserve an active account-level set when another strong factor is enrolled.
// Return plaintext only for a new set, so callers never redisplay stored codes.
export async function issueRecoveryCodesIfAbsent(
  repos: Repos,
  userId: UserId,
): Promise<string[] | null> {
  const active = await repos.userRecoveryCodes.getActiveSet(userId);
  if (active) {
    return null;
  }

  const codes = generateRecoveryCodes();
  await repos.userRecoveryCodes.issueSet(
    userId,
    "enroll",
    codes.map(hashRecoveryCode),
  );
  return codes;
}

export async function regenerateRecoveryCodes(
  repos: Repos,
  userId: UserId,
): Promise<string[]> {
  const codes = generateRecoveryCodes();
  await repos.userRecoveryCodes.regenerateSet(
    userId,
    codes.map(hashRecoveryCode),
  );
  return codes;
}
