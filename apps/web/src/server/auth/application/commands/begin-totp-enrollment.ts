import QRCode from "qrcode";

import { encryptTotpSecret } from "~/lib/auth/totp/secret-crypto";
import {
  buildTotpProvisioningUri,
  generateTotpSecret,
} from "~/lib/auth/totp/totp";
import type { AppContext } from "~/server/shared/action-runtime/context";
import { domainError, type DomainError } from "~/server/shared/domain-error";
import { Err, Ok, type Result } from "~/server/shared/result";

import type { TotpEnrollmentContext } from "../../infrastructure/totp-context";

export async function beginTotpEnrollment(
  ctx: AppContext,
  deps: TotpEnrollmentContext,
): Promise<
  Result<
    {
      otpauthUri: string;
      qrCodeDataUrl: string;
    },
    DomainError
  >
> {
  const user = await deps.repos.users.findById(ctx.actor.userId);
  if (!user) {
    return Err(domainError("forbidden", null, "Unauthorized"));
  }

  const existing = await deps.repos.userTotpFactors.findByUserId(user.id);
  if (existing?.is_enabled === 1) {
    return Err(
      domainError("conflict", "totp_already_enabled", "TOTP already enabled"),
    );
  }

  const secret = generateTotpSecret();
  const encrypted = await encryptTotpSecret(secret);
  await deps.repos.userTotpFactors.createOrRotate(user.id, encrypted);

  const otpauthUri = buildTotpProvisioningUri(secret, user.email);
  return Ok({
    otpauthUri,
    qrCodeDataUrl: await QRCode.toDataURL(otpauthUri),
  });
}
