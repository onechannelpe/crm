import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/server";

import {
  createPasskeyProvider,
  PasskeyRequestError,
  resolveWebauthnRelyingParty,
  type PasskeyProviderDeps,
} from "~/server/auth/factors/passkey-provider";

import type { TestDbContext } from "../runtime/db";

const TEST_RELYING_PARTY = resolveWebauthnRelyingParty("http://localhost:5173");

export function createTestPasskeyProvider(repos: PasskeyProviderDeps) {
  return createPasskeyProvider(repos, TEST_RELYING_PARTY);
}

type WebauthnOverrides = {
  getRegistrationOptions?: (
    userId: number,
  ) => Promise<PublicKeyCredentialCreationOptionsJSON>;
  verifyRegistration?: (
    userId: number,
    response: unknown,
    challenge: string,
  ) => Promise<{ verified: boolean }>;
  verifyAuthentication?: () => Promise<{ verified: boolean; userId: number }>;
};

interface PasskeyCredentialResponse {
  id: string;
  rawId: string;
  type: "public-key";
  clientExtensionResults: Record<string, never>;
}

export function expiresAtFromNow(nowMs: number): number {
  return nowMs + 60_000;
}

export async function createAuthFlow(input: {
  ctx: TestDbContext;
  userId: number;
  challenge: string;
  identifier?: string;
  nowMs?: number;
}) {
  const nowMs = input.nowMs ?? Date.now();
  const challengeId = await input.ctx.repos.webauthnChallenges.create({
    user_id: input.userId,
    type: "authentication",
    challenge: input.challenge,
    expires_at: expiresAtFromNow(nowMs),
  });
  const flowId = await input.ctx.repos.loginFlows.create({
    identifier: input.identifier ?? "exec.one",
    primary_auth_method: "passkey",
    user_id: input.userId,
    challenge_id: challengeId,
    state: "passkey",
    expires_at: expiresAtFromNow(nowMs),
  });
  return { challengeId, flowId };
}

export async function createRegistrationChallenge(input: {
  ctx: TestDbContext;
  userId: number;
  challenge: string;
  nowMs?: number;
}) {
  const nowMs = input.nowMs ?? Date.now();
  return input.ctx.repos.webauthnChallenges.create({
    user_id: input.userId,
    type: "registration",
    challenge: input.challenge,
    expires_at: expiresAtFromNow(nowMs),
  });
}

export function createWebauthnProvider(overrides: WebauthnOverrides = {}) {
  return {
    async getRegistrationOptions(userId: number) {
      if (overrides.getRegistrationOptions) {
        return overrides.getRegistrationOptions(userId);
      }
      throw new Error("not used in this test");
    },
    async verifyRegistration(
      userId: number,
      response: unknown,
      challenge: string,
    ) {
      if (overrides.verifyRegistration) {
        return overrides.verifyRegistration(userId, response, challenge);
      }
      throw new Error("not used in this test");
    },
    async getAuthenticationOptions() {
      throw new Error("not used in this test");
    },
    async getAuthenticationOptionsForChallenge() {
      throw new Error("not used in this test");
    },
    async verifyAuthentication() {
      if (overrides.verifyAuthentication) {
        return overrides.verifyAuthentication();
      }
      return { verified: true, userId: 1 };
    },
  };
}

export function createWebauthnProviderWithAuth(
  verifyAuthentication: NonNullable<WebauthnOverrides["verifyAuthentication"]>,
) {
  return createWebauthnProvider({ verifyAuthentication });
}

export function createWebauthnProviderWithRegistration(
  verifyRegistration: NonNullable<WebauthnOverrides["verifyRegistration"]>,
) {
  return createWebauthnProvider({ verifyRegistration });
}

export function buildAssertionResponse(
  credentialId = "passkey-1",
): PasskeyCredentialResponse & {
  response: {
    authenticatorData: string;
    clientDataJSON: string;
    signature: string;
  };
} {
  return {
    id: credentialId,
    rawId: credentialId,
    type: "public-key",
    clientExtensionResults: {},
    response: {
      authenticatorData: "a",
      clientDataJSON: "b",
      signature: "c",
    },
  };
}

export function buildRegistrationResponse(
  credentialId = "cred-r1",
): PasskeyCredentialResponse & {
  response: {
    clientDataJSON: string;
    attestationObject: string;
  };
} {
  return {
    id: credentialId,
    rawId: credentialId,
    type: "public-key",
    clientExtensionResults: {},
    response: {
      clientDataJSON: "a",
      attestationObject: "b",
    },
  };
}

export function invalidRegistrationProvider() {
  return createWebauthnProvider({
    async verifyRegistration() {
      throw new PasskeyRequestError("invalid registration");
    },
  });
}
