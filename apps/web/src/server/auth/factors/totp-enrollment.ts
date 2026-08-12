import { auditEntityId } from "~/domain/audit/entity";
import { fail, type DomainError } from "~/domain/errors";
import type { UserId } from "~/domain/ids";
import { decryptTotpSecret } from "~/server/auth/totp/secret-crypto";
import { verifyTotpCode } from "~/server/auth/totp/totp";
import { Err, Ok, type Result } from "~/shared/result";

import type { AuthSetupRepos } from "../infrastructure/setup-context";

export interface VerifiedTotpEnrollment {
  userId: UserId;
  secretEncrypted: string;
}

export async function verifyTotpEnrollment(
  repos: Pick<AuthSetupRepos, "userTotpFactors">,
  input: { userId: UserId; code: string },
): Promise<Result<VerifiedTotpEnrollment, DomainError>> {
  const factor = await repos.userTotpFactors.findByUserId(input.userId);
  if (!factor) {
    return Err(fail("totp_setup_invalid"));
  }

  const secret = await decryptTotpSecret(factor.secret_encrypted);
  if (!verifyTotpCode(secret, input.code)) {
    return Err(fail("totp_code_invalid"));
  }

  return Ok({
    userId: input.userId,
    secretEncrypted: factor.secret_encrypted,
  });
}

export async function persistVerifiedTotpEnrollment(
  repos: Pick<AuthSetupRepos, "events" | "userTotpFactors">,
  enrollment: VerifiedTotpEnrollment,
  occurredAt: Date,
): Promise<Result<void, DomainError>> {
  const enabled = await repos.userTotpFactors.enableIfSecretMatches(
    enrollment.userId,
    enrollment.secretEncrypted,
    occurredAt,
  );
  if (!enabled) {
    return Err(fail("totp_setup_invalid"));
  }

  await repos.events.append({
    type: "totp_enabled",
    entityType: "user",
    entityId: auditEntityId("user", enrollment.userId),
    actorUserId: enrollment.userId,
    occurredAt,
  });

  return Ok(undefined);
}
