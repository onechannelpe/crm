import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
  type PublicKeyCredentialRequestOptionsJSON,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";

import { env } from "~/lib/env";
import type { Repositories } from "~/server/shared/registry";

const rpName = "CRM OneChannel";
const rpID = env.webauthnRpId;
const origin = env.webauthnOrigin;

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

type PasskeyServiceDeps = Pick<Repositories, "passkeys" | "auditLogs">;

export function createPasskeyService(repos: PasskeyServiceDeps) {
  async function buildAuthenticationOptions(
    input: {
      userId?: number;
      userVerification: "preferred" | "required";
    },
    challenge?: string,
  ): Promise<PublicKeyCredentialRequestOptionsJSON> {
    const allowCredentials = input.userId
      ? (await repos.passkeys.findByUser(input.userId)).map((p) => ({
          id: p.id,
          type: "public-key" as const,
          transports: parseStoredTransports(p.transports),
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
    async getRegistrationOptions(userId: number) {
      const existingPasskeys = await repos.passkeys.findByUser(userId);

      const options = await generateRegistrationOptions({
        rpName,
        rpID,
        userName: `user-${userId}`,
        excludeCredentials: existingPasskeys.map((p) => ({
          id: p.id,
          transports: parseStoredTransports(p.transports),
        })),
        authenticatorSelection: {
          residentKey: "preferred",
          userVerification: "preferred",
        },
      });

      await repos.auditLogs.create({
        user_id: userId,
        action: "passkey_registration_started",
        entity_type: "passkey",
        entity_id: userId,
        changes: null,
        created_at: Date.now(),
      });

      return options;
    },

    async verifyRegistration(
      userId: number,
      response: RegistrationResponseJSON,
      challenge: string,
    ) {
      let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
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
      await repos.passkeys.create({
        id: credential.id,
        user_id: userId,
        public_key: Buffer.from(credential.publicKey).toString("base64"),
        counter: credential.counter,
        transports: response.response.transports
          ? JSON.stringify(response.response.transports)
          : null,
      });

      return { verified: true };
    },

    async getAuthenticationOptions(input: {
      userId?: number;
      userVerification: "preferred" | "required";
    }) {
      return buildAuthenticationOptions(input);
    },

    async getAuthenticationOptionsForChallenge(input: {
      userId: number;
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

      let verification: Awaited<
        ReturnType<typeof verifyAuthenticationResponse>
      >;
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

      await repos.passkeys.updateCounter(
        passkey.id,
        verification.authenticationInfo.newCounter,
      );

      return { verified: true, userId: passkey.user_id };
    },
  };
}
