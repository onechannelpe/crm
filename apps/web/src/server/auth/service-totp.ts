import QRCode from "qrcode";

import { issueSessionTransition } from "~/lib/auth/session/session-transition";
import {
  decryptTotpSecret,
  encryptTotpSecret,
} from "~/lib/auth/totp/secret-crypto";
import {
  buildTotpProvisioningUri,
  generateTotpSecret,
  verifyTotpCode,
} from "~/lib/auth/totp/totp";
import type { AppContext } from "~/server/shared/action-runtime";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import { authRepos } from "./repos";

export async function beginTotpEnrollment(ctx: AppContext): Promise<
  Result<
    {
      otpauthUri: string;
      qrCodeDataUrl: string;
    },
    DomainError
  >
> {
  const user = await authRepos.users.findById(ctx.actor.userId);
  if (!user) {
    return Err(domainError("forbidden", "forbidden", "Unauthorized"));
  }

  const existing = await authRepos.userTotpFactors.findByUserId(user.id);
  if (existing?.is_enabled === 1) {
    return Err(
      domainError("conflict", "totp_already_enabled", "TOTP already enabled"),
    );
  }

  const secret = generateTotpSecret();
  const encrypted = await encryptTotpSecret(secret);
  await authRepos.userTotpFactors.createOrRotate(user.id, encrypted);

  const otpauthUri = buildTotpProvisioningUri(secret, user.email);
  return Ok({
    otpauthUri,
    qrCodeDataUrl: await QRCode.toDataURL(otpauthUri),
  });
}

export async function finishTotpEnrollment(
  ctx: AppContext,
  input: { code: string },
): Promise<
  Result<{ recoveryCodes: string[]; sessionToken: string }, DomainError>
> {
  const user = await authRepos.users.findById(ctx.actor.userId);
  const factor = await authRepos.userTotpFactors.findByUserId(ctx.actor.userId);
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

  await authRepos.userTotpFactors.markEnabled(user.id);
  const recoveryCodes = generateRecoveryCodes();
  const hashes = await hashRecoveryCodes(recoveryCodes);
  await authRepos.userTotpRecoveryCodes.replaceForUser(user.id, hashes);
  await authRepos.auditLogs.create({
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
    deps: authRepos,
  });

  return Ok({
    recoveryCodes,
    sessionToken: issued.token,
  });
}
