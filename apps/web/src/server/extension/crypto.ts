import { env } from "~/lib/env";

import type { ExtensionHandoffClaims, ExtensionSyncClaims } from "./contracts";

type ExtensionTokenClaims = ExtensionHandoffClaims | ExtensionSyncClaims;

interface ExtensionTokenHeader {
  alg: "EdDSA";
  typ: "JWT";
}

function toBase64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromBase64(value: string): Uint8Array {
  return Buffer.from(value, "base64");
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function encodeJson(value: unknown): string {
  return toBase64Url(new TextEncoder().encode(JSON.stringify(value)));
}

function encodeSigningInput(header: ExtensionTokenHeader, claims: ExtensionTokenClaims): Uint8Array {
  return Buffer.from(`${encodeJson(header)}.${encodeJson(claims)}`, "utf8");
}

async function importPrivateKey(): Promise<CryptoKey> {
  if (!env.extensionHandoffPrivateKeyPkcs8Base64) {
    throw new Error("Missing extension handoff private key");
  }

  return crypto.subtle.importKey(
    "pkcs8",
    toArrayBuffer(fromBase64(env.extensionHandoffPrivateKeyPkcs8Base64)),
    { name: "Ed25519" },
    false,
    ["sign"],
  );
}

export async function signExtensionToken(
  claims: ExtensionTokenClaims,
): Promise<string> {
  const header: ExtensionTokenHeader = {
    alg: "EdDSA",
    typ: "JWT",
  };
  const signingInput = encodeSigningInput(header, claims);
  const privateKey = await importPrivateKey();
  const signature = new Uint8Array(
    await crypto.subtle.sign("Ed25519", privateKey, toArrayBuffer(signingInput)),
  );
  const [encodedHeader, encodedPayload] = new TextDecoder()
    .decode(signingInput)
    .split(".");

  return `${encodedHeader}.${encodedPayload}.${toBase64Url(signature)}`;
}

export async function hashExtensionSyncToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return toBase64Url(new Uint8Array(digest));
}
