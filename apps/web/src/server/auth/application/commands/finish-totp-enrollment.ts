import { issueSessionTransition } from "~/lib/auth/session/session-transition";
import { decryptTotpSecret } from "~/lib/auth/totp/secret-crypto";
import { verifyTotpCode } from "~/lib/auth/totp/totp";
import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { TotpEnrollmentContext } from "../../infrastructure/totp-context";

export async function finishTotpEnrollment(
  ctx: AppContext,
  deps: TotpEnrollmentContext,
  input: { code: string },
): Promise<
  Result<{ recoveryCodes: string[]; sessionToken: string }, DomainError>
> {
  const user = await deps.repos.users.findById(ctx.actor.userId);
  const factor = await deps.repos.userTotpFactors.findByUserId(
    ctx.actor.userId,
  );
  if (!user || !factor) {
    return Err(
      domainError(
        "validation",
        "totp_setup_invalid",
        "Invalid TOTP setup request",
      ),
    );
  }

  const { generateRecoveryCodes, hashRecoveryCodes } =
    await import("~/lib/auth/totp/recovery-codes");
  const secret = await decryptTotpSecret(factor.secret_encrypted);
  if (!verifyTotpCode(secret, input.code)) {
    return Err(
      domainError("validation", "totp_code_invalid", "Invalid TOTP code"),
    );
  }

  await deps.repos.userTotpFactors.markEnabled(user.id);
  const recoveryCodes = generateRecoveryCodes();
  const hashes = await hashRecoveryCodes(recoveryCodes);
  await deps.repos.userTotpRecoveryCodes.replaceForUser(user.id, hashes);
  await deps.repos.auditLogs.create({
    user_id: user.id,
    action: "totp_enabled",
    entity_type: "user",
    entity_id: user.id,
    changes: null,
    created_at: ctx.now(),
  });

  const issued = await issueSessionTransition({
    user,
    sessionClass: ctx.actor.sessionClass,
    request: {
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    primaryAuthMethod: ctx.actor.primaryAuthMethod,
    strongAuthMethod: "totp",
    strongAuthAt: ctx.now(),
    deps: deps.repos,
  });

  return Ok({
    recoveryCodes,
    sessionToken: issued.token,
  });
}
