import * as OTPAuth from "otpauth";

export function generateTotpSecret(): string {
  const secret = new OTPAuth.Secret({ size: 20 });
  return secret.base32;
}

function buildTotp(secretBase32: string, label: string): OTPAuth.TOTP {
  return new OTPAuth.TOTP({
    issuer: "OneChannel CRM",
    label,
    algorithm: "SHA1",
    digits: 6,
    period: 30,
    secret: OTPAuth.Secret.fromBase32(secretBase32),
  });
}

export function buildTotpProvisioningUri(
  secretBase32: string,
  email: string,
): string {
  return buildTotp(secretBase32, email).toString();
}

export function verifyTotpCode(
  secretBase32: string,
  email: string,
  token: string,
): boolean {
  const delta = buildTotp(secretBase32, email).validate({
    token,
    window: 1,
  });
  return delta !== null;
}

export function generateCurrentTotpCode(
  secretBase32: string,
  email: string,
): string {
  return buildTotp(secretBase32, email).generate();
}
