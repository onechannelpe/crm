import {
  EXTENSION_HANDOFF_TOKEN_ISSUER,
  EXTENSION_SESSION_TOKEN_AUDIENCE,
} from "./contracts";
import { hashExtensionSecretToken, signExtensionToken } from "./crypto";

export const EXTENSION_INSTALLATION_SESSION_TTL_MS = 8 * 60 * 60_000;
export const EXTENSION_ACCESS_TOKEN_TTL_MS = 15 * 60_000;

export interface InstallationSessionRecord {
  jti: string;
  user_id: number;
  branch_id: number;
  auth_session_id: string;
  installation_id: string;
  refresh_token_hash: string;
  issued_at: number;
  expires_at: number;
  revoked_at: number | null;
  last_seen_at: number | null;
  refreshed_at: number | null;
}

export interface SessionCredentials {
  refreshToken: string;
  refreshTokenHash: string;
  sessionToken: string;
  expiresAt: number;
}

export function accessTokenExpiresAt(issuedAt: number): number {
  return issuedAt + EXTENSION_ACCESS_TOKEN_TTL_MS;
}

export function installationSessionExpiresAt(issuedAt: number): number {
  return issuedAt + EXTENSION_INSTALLATION_SESSION_TTL_MS;
}

export function generateRefreshToken(): string {
  return crypto.randomUUID();
}

export async function signInstallationSessionToken(
  session: InstallationSessionRecord,
  issuedAt: number,
): Promise<string> {
  return signExtensionToken({
    iss: EXTENSION_HANDOFF_TOKEN_ISSUER,
    aud: EXTENSION_SESSION_TOKEN_AUDIENCE,
    sub: `user:${session.user_id}`,
    authSessionId: session.auth_session_id,
    branchId: session.branch_id,
    installationId: session.installation_id,
    jti: session.jti,
    iat: issuedAt,
    exp: Math.floor(accessTokenExpiresAt(issuedAt) / 1000),
  });
}

export async function issueSessionCredentials(
  session: InstallationSessionRecord,
  issuedAt: number,
): Promise<SessionCredentials> {
  const refreshToken = generateRefreshToken();
  const refreshTokenHash = await hashExtensionSecretToken(refreshToken);

  return {
    refreshToken,
    refreshTokenHash,
    sessionToken: await signInstallationSessionToken(session, issuedAt),
    expiresAt: accessTokenExpiresAt(issuedAt),
  };
}
