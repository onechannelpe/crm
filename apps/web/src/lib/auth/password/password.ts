import { hash, verify } from "@node-rs/argon2";

/**
 * Hashes password using Argon2id algorithm.
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
 * @param passwordHash - Argon2id hash from database
 * @param password - Plain text password to verify
 * @returns true if password matches hash
 */
export async function verifyPassword(
  passwordHash: string,
  password: string,
): Promise<boolean> {
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}
