import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type VerifiedAuthenticationResponse,
  type VerifiedRegistrationResponse,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";

import type { UserId } from "~/server/shared/ids";
import type { createPasskeysRepo } from "~/server/users/repos-passkeys";

const rpName = "Culqi360";

export interface WebauthnRelyingParty {
  rpID: string;
  origin: string;
}

export function resolveWebauthnRelyingParty(
  publicOrigin: string,
): WebauthnRelyingParty {
  return {
    origin: publicOrigin,
    rpID: new URL(publicOrigin).hostname,
  };
}

export class PasskeyRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PasskeyRequestError";
  }
}

export function isPasskeyRequestError(
  error: unknown,
): error is PasskeyRequestError {
  return error instanceof PasskeyRequestError;
}

type PasskeyTransport = NonNullable<
  RegistrationResponseJSON["response"]["transports"]
>[number];

const KNOWN_TRANSPORTS: readonly PasskeyTransport[] = [
  "ble",
  "cable",
  "hybrid",
  "internal",
  "nfc",
  "smart-card",
  "usb",
];

function isPasskeyTransport(value: string): value is PasskeyTransport {
  return KNOWN_TRANSPORTS.some((transport) => transport === value);
}

function parseStoredTransports(
  value: string | null,
): PasskeyTransport[] | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed: unknown = JSON.parse(value);
    if (
      Array.isArray(parsed) &&
      parsed.every(
        (item) => typeof item === "string" && isPasskeyTransport(item),
      )
    ) {
      return parsed;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export type PasskeyProviderDeps = {
  passkeys: ReturnType<typeof createPasskeysRepo>;
};

export interface VerifiedRegistrationCredential {
  id: string;
  publicKey: string;
  counter: number;
  transports: string | null;
}

export interface VerifiedAuthenticationCredential {
  credentialId: string;
  newCounter: number;
  previousCounter: number;
  userId: UserId;
}

export function createPasskeyProvider(
  repos: PasskeyProviderDeps,
  relyingParty: WebauthnRelyingParty,
) {
  const { origin, rpID } = relyingParty;

  async function buildAuthenticationOptions(
    input: {
      userId?: UserId;
      userVerification: "preferred" | "required";
    },
    challenge?: string,
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const allowCredentials = input.userId
      ? (await repos.passkeys.findByUser(input.userId)).map((passkey) => ({
          id: passkey.id,
          type: "public-key" as const,
          transports: parseStoredTransports(passkey.transports),
        }))
      : [];

    if (challenge) {
      return {
        rpId: rpID,
        challenge,
        allowCredentials,
        timeout: 60000,
        userVerification: input.userVerification,
        extensions: undefined,
      };
    }

    return generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: input.userVerification,
    });
  }

  return {
    async getRegistrationOptions(userId: UserId) {
      const existingPasskeys = await repos.passkeys.findByUser(userId);

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: `user-${userId}`,
        excludeCredentials: existingPasskeys.map((passkey) => ({
          id: passkey.id,
          transports: parseStoredTransports(passkey.transports),
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
      });

      return options;
    },

    async verifyRegistration(
      userId: UserId,
      response: RegistrationResponseJSON,
      challenge: string,
    ) {
      let verification: VerifiedRegistrationResponse;
      try {
        verification = await verifyRegistrationResponse({
          response,
          expectedChallenge: challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
        });
      } catch {
        throw new PasskeyRequestError("Registration verification failed");
      }

      if (!verification.verified || !verification.registrationInfo) {
        throw new PasskeyRequestError("Registration verification failed");
      }

      const { credential } = verification.registrationInfo;
      const registered: VerifiedRegistrationCredential = {
        id: credential.id,
        publicKey: Buffer.from(credential.publicKey).toString("base64"),
        counter: credential.counter,
        transports: response.response.transports
          ? JSON.stringify(response.response.transports)
          : null,
      };

      return { verified: true, credential: registered };
    },

    async getAuthenticationOptions(input: {
      userId?: UserId;
      userVerification: "preferred" | "required";
    }) {
      return buildAuthenticationOptions(input);
    },

    async getAuthenticationOptionsForChallenge(input: {
      userId: UserId;
      challenge: string;
      userVerification: "preferred" | "required";
    }) {
      return buildAuthenticationOptions(input, input.challenge);
    },

    async verifyAuthentication(
      response: AuthenticationResponseJSON,
      challenge: string,
    ) {
      const passkey = await repos.passkeys.findById(response.id);
      if (!passkey) throw new PasskeyRequestError("Passkey not found");

      let verification: VerifiedAuthenticationResponse;
      try {
        verification = await verifyAuthenticationResponse({
          response,
          expectedChallenge: challenge,
          expectedOrigin: origin,
          expectedRPID: rpID,
          credential: {
            id: passkey.id,
            publicKey: Buffer.from(passkey.public_key, "base64"),
            counter: passkey.counter,
            transports: parseStoredTransports(passkey.transports),
          },
        });
      } catch {
        throw new PasskeyRequestError("Authentication verification failed");
      }

      if (!verification.verified) {
        throw new PasskeyRequestError("Authentication verification failed");
      }

      return {
        verified: true,
        credentialId: passkey.id,
        newCounter: verification.authenticationInfo.newCounter,
        previousCounter: passkey.counter,
        userId: passkey.user_id,
      };
    },
  };
}

export type WebauthnProvider = ReturnType<typeof createPasskeyProvider>;
