import QRCode from "qrcode";

import { fail, forbidden, type DomainError } from "~/domain/errors";
import { encryptTotpSecret } from "~/server/auth/totp/secret-crypto";
import {
  buildTotpProvisioningUri,
  generateTotpSecret,
} from "~/server/auth/totp/totp";
import type { AppContext } from "~/server/platform/action/context";
import { Err, isErr, Ok, type Result } from "~/shared/result";

import type { AuthSetupContext } from "../infrastructure/setup-context";

export async function startTotpEnrollment(
  ctx: AppContext,
  deps: AuthSetupContext,
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
  if (!user) return Err(forbidden());

  const secret = generateTotpSecret();
  const encrypted = await encryptTotpSecret(secret);
  const otpauthUri = buildTotpProvisioningUri(secret, user.email);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);
  const changedAt = ctx.operationAt;

  const persisted = await deps.uow.run(async (repos) => {
    const lockedUser = await repos.users.findByIdForUpdate(ctx.actor.userId);
    if (!lockedUser) return Err(forbidden());

    const existing = await repos.userTotpFactors.findByUserId(lockedUser.id);
    if (existing?.is_enabled) {
      return Err(fail("totp_already_enabled"));
    }

    await repos.userTotpFactors.createOrRotate(
      lockedUser.id,
      encrypted,
      changedAt,
    );

    return Ok(undefined);
  });
  if (isErr(persisted)) return persisted;

  return Ok({ otpauthUri, qrCodeDataUrl });
}
