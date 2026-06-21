import { generateKeyPairSync } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  EXTENSION_HANDOFF_TOKEN_AUDIENCE,
  EXTENSION_HANDOFF_TOKEN_ISSUER,
} from "~/server/extension/contracts";
import {
  signExtensionToken,
  verifyExtensionToken,
} from "~/server/extension/crypto";
import { isExtensionHandoffClaims } from "~/server/extension/service/validators";

function stubExtensionTokenKeys() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");

  vi.stubEnv(
    "EXTENSION_HANDOFF_PRIVATE_KEY_PKCS8_BASE64",
    Buffer.from(privateKey.export({ format: "der", type: "pkcs8" })).toString(
      "base64",
    ),
  );
  vi.stubEnv(
    "EXTENSION_HANDOFF_PUBLIC_KEY_SPKI_BASE64",
    Buffer.from(publicKey.export({ format: "der", type: "spki" })).toString(
      "base64",
    ),
  );
}

function stubMismatchedPublicKey() {
  const { publicKey } = generateKeyPairSync("ed25519");

  vi.stubEnv(
    "EXTENSION_HANDOFF_PUBLIC_KEY_SPKI_BASE64",
    Buffer.from(publicKey.export({ format: "der", type: "spki" })).toString(
      "base64",
    ),
  );
}

describe("extension token crypto", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("signs with the private key and verifies with the configured public key", async () => {
    stubExtensionTokenKeys();

    const claims = {
      iss: EXTENSION_HANDOFF_TOKEN_ISSUER,
      aud: EXTENSION_HANDOFF_TOKEN_AUDIENCE,
      sub: "user:42",
      authSessionId: "session-1",
      branchId: 7,
      assignmentId: 13,
      contactId: 19,
      phone: "+51999999999",
      clientName: "Ada Lovelace",
      organizationLabel: "Analytical Engines",
      action: "start_call",
      origin: "http://localhost:3000",
      jti: crypto.randomUUID(),
      iat: 1_700_000_000,
      exp: 1_700_000_120,
    } as const;

    const token = await signExtensionToken(claims);

    await expect(
      verifyExtensionToken(token, isExtensionHandoffClaims),
    ).resolves.toEqual(claims);
  });

  it("rejects a token when the public key does not match the signing key", async () => {
    stubExtensionTokenKeys();

    const token = await signExtensionToken({
      iss: EXTENSION_HANDOFF_TOKEN_ISSUER,
      aud: EXTENSION_HANDOFF_TOKEN_AUDIENCE,
      sub: "user:42",
      authSessionId: "session-1",
      branchId: 7,
      assignmentId: 13,
      contactId: 19,
      phone: "+51999999999",
      clientName: null,
      organizationLabel: null,
      action: "start_call",
      origin: "http://localhost:3000",
      jti: crypto.randomUUID(),
      iat: 1_700_000_000,
      exp: 1_700_000_120,
    });

    stubMismatchedPublicKey();

    await expect(
      verifyExtensionToken(token, isExtensionHandoffClaims),
    ).rejects.toThrow("invalid token signature");
  });
});
