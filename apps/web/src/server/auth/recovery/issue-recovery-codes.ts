import type { UserId } from "~/domain/ids";
import {
  generateRecoveryCodes,
  hashRecoveryCode,
} from "~/server/auth/recovery/recovery-codes";
import type { UserRecoveryCodesRepo } from "~/server/auth/repos-user-recovery-codes";

type Repos = { userRecoveryCodes: UserRecoveryCodesRepo };

// Preserve acknowledged account-level codes when another factor is enrolled.
// Replace an unacknowledged set so a lost response can never strand plaintext
// codes that the user did not receive.
export async function issueRecoveryCodesForEnrollment(
  repos: Repos,
  userId: UserId,
  issuedAt: Date,
): Promise<string[]> {
  const active = await repos.userRecoveryCodes.getActiveSet(userId);
  if (active?.acknowledgedAt) {
    return [];
  }

  const codes = generateRecoveryCodes();
  if (active) {
    await repos.userRecoveryCodes.replaceSet(
      userId,
      codes.map(hashRecoveryCode),
      issuedAt,
    );
    return codes;
  }

  await repos.userRecoveryCodes.issueSet(
    userId,
    "enroll",
    codes.map(hashRecoveryCode),
    issuedAt,
  );
  return codes;
}

export async function regenerateRecoveryCodes(
  repos: Repos,
  userId: UserId,
  regeneratedAt: Date,
): Promise<string[]> {
  const codes = generateRecoveryCodes();
  await repos.userRecoveryCodes.replaceSet(
    userId,
    codes.map(hashRecoveryCode),
    regeneratedAt,
  );
  return codes;
}
