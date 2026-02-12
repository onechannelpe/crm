import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { db } from "~/infrastructure/db/client";
import { env } from "~/shared/env";

const CHALLENGE_TTL = 5 * 60 * 1000;

export async function createRegistrationOptions(userId: number, email: string) {
  const existingPasskeys = await db
    .selectFrom("passkeys")
    .select(["id", "transports"])
    .where("user_id", "=", userId)
    .execute();

  const options = await generateRegistrationOptions({
    rpName: "CRM System",
    rpID: env.webauthnRpId,
    userID: userId.toString(),
    userName: email,
    attestationType: "none",
    authenticatorSelection: {
      userVerification: "required",
      residentKey: "preferred",
    },
    excludeCredentials: existingPasskeys.map((pk) => ({
      id: pk.id,
      type: "public-key" as const,
      transports: pk.transports ? JSON.parse(pk.transports) : undefined,
    })),
  });

  await db
    .insertInto("webauthn_challenges")
    .values({
      user_id: userId,
      type: "registration",
      challenge: options.challenge,
      created_at: Date.now(),
      expires_at: Date.now() + CHALLENGE_TTL,
    })
    .execute();

  return options;
}

export async function verifyRegistration(
  userId: number,
  response: RegistrationResponseJSON,
) {
  const challenge = await db
    .selectFrom("webauthn_challenges")
    .select(["challenge", "expires_at"])
    .where("user_id", "=", userId)
    .where("type", "=", "registration")
    .orderBy("created_at", "desc")
    .executeTakeFirst();

  if (!challenge || Date.now() >= challenge.expires_at) {
    throw new Error("Challenge expired");
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: env.webauthnOrigin,
    expectedRPID: env.webauthnRpId,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Verification failed");
  }

  const { credentialID, credentialPublicKey, counter } = verification.registrationInfo;

  await db
    .insertInto("passkeys")
    .values({
      id: Buffer.from(credentialID).toString("base64url"),
      user_id: userId,
      public_key: Buffer.from(credentialPublicKey).toString("base64url"),
      counter,
      transports: response.response.transports ? JSON.stringify(response.response.transports) : null,
      created_at: Date.now(),
      last_used_at: null,
    })
    .execute();

  await db
    .deleteFrom("webauthn_challenges")
    .where("user_id", "=", userId)
    .where("type", "=", "registration")
    .execute();

  return true;
}

export async function createAuthenticationOptions(userId: number) {
  const passkeys = await db
    .selectFrom("passkeys")
    .select(["id", "transports"])
    .where("user_id", "=", userId)
    .execute();

  if (passkeys.length === 0) {
    throw new Error("No passkeys enrolled");
  }

  const options = await generateAuthenticationOptions({
    rpID: env.webauthnRpId,
    userVerification: "required",
    allowCredentials: passkeys.map((pk) => ({
      id: pk.id,
      type: "public-key" as const,
      transports: pk.transports ? JSON.parse(pk.transports) : undefined,
    })),
  });

  await db
    .insertInto("webauthn_challenges")
    .values({
      user_id: userId,
      type: "authentication",
      challenge: options.challenge,
      created_at: Date.now(),
      expires_at: Date.now() + CHALLENGE_TTL,
    })
    .execute();

  return options;
}

export async function verifyAuthentication(
  userId: number,
  response: AuthenticationResponseJSON,
) {
  const challenge = await db
    .selectFrom("webauthn_challenges")
    .select(["challenge", "expires_at"])
    .where("user_id", "=", userId)
    .where("type", "=", "authentication")
    .orderBy("created_at", "desc")
    .executeTakeFirst();

  if (!challenge || Date.now() >= challenge.expires_at) {
    throw new Error("Challenge expired");
  }

  const passkey = await db
    .selectFrom("passkeys")
    .selectAll()
    .where("id", "=", response.id)
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (!passkey) {
    throw new Error("Passkey not found");
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: env.webauthnOrigin,
    expectedRPID: env.webauthnRpId,
    authenticator: {
      credentialID: Buffer.from(passkey.id, "base64url"),
      credentialPublicKey: Buffer.from(passkey.public_key, "base64url"),
      counter: passkey.counter,
      transports: passkey.transports ? JSON.parse(passkey.transports) : undefined,
    },
    requireUserVerification: true,
  });

  if (!verification.verified) {
    throw new Error("Verification failed");
  }

  await db
    .updateTable("passkeys")
    .set({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: Date.now(),
    })
    .where("id", "=", passkey.id)
    .execute();

  await db
    .deleteFrom("webauthn_challenges")
    .where("user_id", "=", userId)
    .where("type", "=", "authentication")
    .execute();

  return true;
}

export async function countUserPasskeys(userId: number): Promise<number> {
  const result = await db
    .selectFrom("passkeys")
    .select((eb) => eb.fn.countAll().as("count"))
    .where("user_id", "=", userId)
    .executeTakeFirst();

  return Number(result?.count || 0);
}

export function isPasskeyRequired(role: string): boolean {
  return ["admin", "sales_manager"].includes(role);
}
