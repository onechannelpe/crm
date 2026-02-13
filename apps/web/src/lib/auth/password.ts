import { hash, verify } from "@node-rs/argon2";

/**
 * Hashes password using Argon2id (most secure variant).
 * Runtime-portable implementation that works on Node.js and Bun.
 * @param password - Plain text password
 * @returns Argon2id hash string
 */
export async function hashPassword(password: string): Promise<string> {
    return hash(password, {
        memoryCost: 19456,
        timeCost: 2,
        parallelism: 1,
        outputLen: 32,
    });
}

/**
 * Verifies password against Argon2id hash.
 * @param hash - Argon2id hash from database
 * @param password - Plain text password to verify
 * @returns true if password matches hash
 */
export async function verifyPassword(hash: string, password: string): Promise<boolean> {
    try {
        return await verify(hash, password);
    } catch {
        return false;
    }
}
