import {
  generateRecoveryCodes,
  hashRecoveryCodes,
} from "~/lib/auth/totp/recovery-codes";
import { decryptTotpSecret } from "~/lib/auth/totp/secret-crypto";
import { verifyTotpCode } from "~/lib/auth/totp/totp";
import { createSessionService } from "~/server/auth/session/session.service";
import type { AppContext } from "~/server/platform/action/context";
import { auditEntityId } from "~/server/shared/audit-entity";
import { fail, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { TotpEnrollmentContext } from "../infrastructure/totp-context";

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
    return Err(fail("totp_setup_invalid"));
  }

  const secret = await decryptTotpSecret(factor.secret_encrypted);
  if (!verifyTotpCode(secret, input.code)) {
    return Err(fail("totp_code_invalid"));
  }

  await deps.repos.userTotpFactors.markEnabled(user.id);
  const recoveryCodes = generateRecoveryCodes();
  const hashes = await hashRecoveryCodes(recoveryCodes);
  await deps.repos.userTotpRecoveryCodes.replaceForUser(user.id, hashes);
  await deps.repos.events.append({
    type: "totp_enabled",
    entityType: "user",
    entityId: auditEntityId("user", user.id),
    actorUserId: user.id,
    occurredAt: ctx.now(),
  });

  const issued = await createSessionService(deps.repos).establish({
    user,
    sessionClass: ctx.actor.sessionClass,
    request: {
      ipAddress: ctx.ipAddress,
      userAgent: ctx.userAgent,
    },
    primaryAuthMethod: ctx.actor.primaryAuthMethod,
    strongAuthMethod: "totp",
    strongAuthAt: ctx.now(),
  });

  return Ok({
    recoveryCodes,
    sessionToken: issued.token,
  });
}
