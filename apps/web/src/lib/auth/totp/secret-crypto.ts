import { createHash, randomBytes, webcrypto } from "node:crypto";

import { serverEnv } from "~/lib/env";

const IV_BYTES = 12;
const ALGORITHM = "AES-GCM";

async function getKey() {
  const env = serverEnv().totp;
  const digest = createHash("sha256").update(env.totpEncryptionKey).digest();
  return webcrypto.subtle.importKey("raw", digest, ALGORITHM, false, [
    "encrypt",
    "decrypt",
  ]);
}

export async function encryptTotpSecret(secret: string): Promise<string> {
  const key = await getKey();
  const iv = randomBytes(IV_BYTES);
  const bytes = new TextEncoder().encode(secret);
  const cipher = await webcrypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    bytes,
  );
  return `${iv.toString("base64")}:${Buffer.from(cipher).toString("base64")}`;
}

export async function decryptTotpSecret(value: string): Promise<string> {
  const parts = value.split(":");
  if (parts.length !== 2) {
    throw new Error("Invalid encrypted secret");
  }
  const [ivRaw, cipherRaw] = parts;
  const iv = Buffer.from(ivRaw, "base64");
  const cipher = Buffer.from(cipherRaw, "base64");
  const key = await getKey();
  const plain = await webcrypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    cipher,
  );
  return new TextDecoder().decode(plain);
}
