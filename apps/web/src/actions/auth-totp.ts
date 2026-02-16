"use server";

import QRCode from "qrcode";

import { requireAuth } from "~/lib/auth/access/session";
import {
  generateRecoveryCodes,
  hashRecoveryCodes,
} from "~/lib/auth/totp/recovery-codes";
import {
  decryptTotpSecret,
  encryptTotpSecret,
} from "~/lib/auth/totp/secret-crypto";
import {
  buildTotpProvisioningUri,
  generateTotpSecret,
  verifyTotpCode,
} from "~/lib/auth/totp/totp";
import { assertNonEmptyString } from "~/lib/contracts/guards";
import { repos } from "~/server/shared/context";

export interface TotpStatusResult {
  enabled: boolean;
}

export async function getTotpStatus(): Promise<TotpStatusResult> {
  const session = await requireAuth();
  const factor = await repos.userTotpFactors.findByUserId(session.userId);
  return { enabled: factor?.is_enabled === 1 };
}

export async function beginTotpEnrollment(): Promise<{
  otpauthUri: string;
  qrCodeDataUrl: string;
}> {
  const session = await requireAuth();
  const user = await repos.users.findById(session.userId);
  if (!user) {
    throw new Error("Unauthorized");
  }
  const existing = await repos.userTotpFactors.findByUserId(user.id);
  if (existing?.is_enabled === 1) {
    throw new Error("TOTP already enabled");
  }

  const secret = generateTotpSecret();
  const encrypted = await encryptTotpSecret(secret);
  await repos.userTotpFactors.createOrRotate(user.id, encrypted);

  const otpauthUri = buildTotpProvisioningUri(secret, user.email);
  const qrCodeDataUrl = await QRCode.toDataURL(otpauthUri);
  return { otpauthUri, qrCodeDataUrl };
}

export async function finishTotpEnrollment(code: string): Promise<string[]> {
  const session = await requireAuth();
  const safeCode = assertNonEmptyString(code, "code");
  const user = await repos.users.findById(session.userId);
  const factor = await repos.userTotpFactors.findByUserId(session.userId);
  if (!user || !factor) {
    throw new Error("Invalid TOTP setup request");
  }

  const secret = await decryptTotpSecret(factor.secret_encrypted);
  const valid = verifyTotpCode(secret, safeCode);
  if (!valid) {
    throw new Error("Invalid TOTP code");
  }

  await repos.userTotpFactors.markEnabled(user.id);
  const recoveryCodes = generateRecoveryCodes();
  const hashes = await hashRecoveryCodes(recoveryCodes);
  await repos.userTotpRecoveryCodes.replaceForUser(user.id, hashes);

  await repos.auditLogs.create({
    user_id: user.id,
    action: "totp_enabled",
    entity_type: "user",
    entity_id: user.id,
    changes: null,
    created_at: Date.now(),
  });

  return recoveryCodes;
}
