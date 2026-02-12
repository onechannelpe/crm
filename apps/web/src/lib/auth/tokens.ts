import { encodeBase32LowerCaseNoPadding, encodeHexLowerCase } from "@oslojs/encoding";
import { sha256 } from "@oslojs/crypto/sha2";

/**
 * Generates a cryptographically secure session token.
 * Uses 160 bits of entropy (20 random bytes).
 * @returns 32-character base32 string
 */
export function generateSessionToken(): string {
    const bytes = new Uint8Array(20);
    crypto.getRandomValues(bytes);
    return encodeBase32LowerCaseNoPadding(bytes);
}

/**
 * Creates one-way hash of session token for database storage.
 * Session ID is stored in DB, token is sent to client.
 * Even if DB is compromised, tokens cannot be recovered.
 * @param token - Session token from cookie
 * @returns 64-character hex string (SHA-256 hash)
 */
export function hashSessionToken(token: string): string {
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hash = sha256(data);
    return encodeHexLowerCase(hash);
}

/**
 * Validates token format to prevent injection attacks.
 * Token must be exactly 32 lowercase base32 characters.
 * @param token - Token to validate
 * @returns true if format is valid
 */
export function isValidTokenFormat(token: string): boolean {
    return /^[a-z2-7]{32}$/.test(token);
}
