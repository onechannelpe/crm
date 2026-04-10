import {
  EXTENSION_HANDOFF_TOKEN_AUDIENCE,
  EXTENSION_HANDOFF_TOKEN_ISSUER,
  EXTENSION_SESSION_TOKEN_AUDIENCE,
  type ExtensionHandoffClaims,
  type ExtensionInstallationSessionClaims,
} from "../contracts";
import { ExtensionTokenVerificationError } from "../crypto";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function isTokenExpired(expSeconds: number, nowMs: number): boolean {
  return expSeconds <= Math.floor(nowMs / 1000);
}

export function parseSubjectUserId(subject: string): number | null {
  if (!subject.startsWith("user:")) {
    return null;
  }

  const parsed = Number(subject.slice("user:".length));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function isExtensionHandoffClaims(
  value: unknown,
): value is ExtensionHandoffClaims {
  return (
    typeof value === "object" &&
    value !== null &&
    "iss" in value &&
    value.iss === EXTENSION_HANDOFF_TOKEN_ISSUER &&
    "aud" in value &&
    value.aud === EXTENSION_HANDOFF_TOKEN_AUDIENCE &&
    "sub" in value &&
    typeof value.sub === "string" &&
    "authSessionId" in value &&
    typeof value.authSessionId === "string" &&
    "branchId" in value &&
    typeof value.branchId === "number" &&
    "assignmentId" in value &&
    typeof value.assignmentId === "number" &&
    "contactId" in value &&
    typeof value.contactId === "number" &&
    "phone" in value &&
    typeof value.phone === "string" &&
    "clientName" in value &&
    (value.clientName === null || typeof value.clientName === "string") &&
    "organizationLabel" in value &&
    (value.organizationLabel === null ||
      typeof value.organizationLabel === "string") &&
    "action" in value &&
    value.action === "start_call" &&
    "origin" in value &&
    typeof value.origin === "string" &&
    "jti" in value &&
    typeof value.jti === "string" &&
    "iat" in value &&
    typeof value.iat === "number" &&
    "exp" in value &&
    typeof value.exp === "number"
  );
}

export function isExtensionInstallationSessionClaims(
  value: unknown,
): value is ExtensionInstallationSessionClaims {
  return (
    typeof value === "object" &&
    value !== null &&
    "iss" in value &&
    value.iss === EXTENSION_HANDOFF_TOKEN_ISSUER &&
    "aud" in value &&
    value.aud === EXTENSION_SESSION_TOKEN_AUDIENCE &&
    "sub" in value &&
    typeof value.sub === "string" &&
    "authSessionId" in value &&
    typeof value.authSessionId === "string" &&
    "branchId" in value &&
    typeof value.branchId === "number" &&
    "installationId" in value &&
    typeof value.installationId === "string" &&
    "jti" in value &&
    typeof value.jti === "string" &&
    "iat" in value &&
    typeof value.iat === "number" &&
    "exp" in value &&
    typeof value.exp === "number"
  );
}

export function isCryptoMisconfiguration(error: unknown): boolean {
  return error instanceof Error && error.message.includes("private key");
}

export function isInvalidExtensionToken(error: unknown): boolean {
  return error instanceof ExtensionTokenVerificationError;
}
