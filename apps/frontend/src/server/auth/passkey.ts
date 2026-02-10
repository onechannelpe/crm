"use server";

import {
  generateRegistrationOptions,
  generateAuthenticationOptions,
  verifyRegistrationResponse,
  verifyAuthenticationResponse,
  type RegistrationResponseJSON,
  type AuthenticationResponseJSON,
} from "@simplewebauthn/server";
import { db } from "~/server/db/client";
import { requireAuth, getAuthSession } from "./session";
import { verifyPassword } from "./password";

const RP_ID = process.env.WEBAUTHN_RP_ID ?? "localhost";
const ORIGIN = process.env.WEBAUTHN_ORIGIN ?? "http://localhost:3000";
const CHALLENGE_TTL = 5 * 60 * 1000;

type AuthenticatorTransport =
  | "usb"
  | "ble"
  | "nfc"
  | "internal"
  | "hybrid"
  | "cable";

export async function createPasskeyRegistrationOptions() {
  const { userId } = await requireAuth();

  const user = await db
    .selectFrom("users")
    .select(["id", "email"])
    .where("id", "=", userId)
    .executeTakeFirstOrThrow();

  const existingPasskeys = await db
    .selectFrom("passkeys")
    .select(["id", "transports"])
    .where("user_id", "=", userId)
    .execute();

  const options = await generateRegistrationOptions({
    rpName: "CRM System",
    rpID: RP_ID,
    userID: userId.toString(),
    userName: user.email,
    attestationType: "none",
    authenticatorSelection: {
      userVerification: "required",
      residentKey: "preferred",
    },
    excludeCredentials: existingPasskeys.map((pk) => ({
      id: pk.id,
      type: "public-key",
      transports: pk.transports
        ? (JSON.parse(pk.transports) as AuthenticatorTransport[])
        : undefined,
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

export async function verifyPasskeyRegistration(
  response: RegistrationResponseJSON,
  passwordConfirmation: string,
) {
  const { userId } = await requireAuth();

  const user = await db
    .selectFrom("users")
    .select(["password_hash"])
    .where("id", "=", userId)
    .executeTakeFirstOrThrow();

  if (!(await verifyPassword(passwordConfirmation, user.password_hash))) {
    throw new Error("Invalid password");
  }

  const challengeRecord = await db
    .selectFrom("webauthn_challenges")
    .select(["id", "challenge", "expires_at"])
    .where("user_id", "=", userId)
    .where("type", "=", "registration")
    .orderBy("created_at", "desc")
    .executeTakeFirst();

  if (!challengeRecord || Date.now() >= challengeRecord.expires_at) {
    throw new Error("Challenge expired");
  }

  await db
    .deleteFrom("webauthn_challenges")
    .where("id", "=", challengeRecord.id)
    .execute();

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) {
    throw new Error("Verification failed");
  }

  const { credentialID, credentialPublicKey, counter } =
    verification.registrationInfo;

  await db
    .insertInto("passkeys")
    .values({
      id: Buffer.from(credentialID).toString("base64url"),
      user_id: userId,
      public_key: Buffer.from(credentialPublicKey).toString("base64url"),
      counter,
      transports: response.response.transports
        ? JSON.stringify(response.response.transports)
        : null,
      created_at: Date.now(),
      last_used_at: null,
    })
    .execute();

  return { success: true };
}

export async function createPasskeyAuthenticationOptions(email: string) {
  const user = await db
    .selectFrom("users")
    .select(["id"])
    .where("email", "=", email)
    .where("is_active", "=", 1)
    .executeTakeFirstOrThrow();

  const passkeys = await db
    .selectFrom("passkeys")
    .select(["id", "transports"])
    .where("user_id", "=", user.id)
    .execute();

  if (passkeys.length === 0) {
    throw new Error("No passkeys enrolled");
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    userVerification: "required",
    allowCredentials: passkeys.map((pk) => ({
      id: pk.id,
      type: "public-key",
      transports: pk.transports
        ? (JSON.parse(pk.transports) as AuthenticatorTransport[])
        : undefined,
    })),
  });

  await db
    .insertInto("webauthn_challenges")
    .values({
      user_id: user.id,
      type: "authentication",
      challenge: options.challenge,
      created_at: Date.now(),
      expires_at: Date.now() + CHALLENGE_TTL,
    })
    .execute();

  return options;
}

export async function verifyPasskeyAuthentication(
  email: string,
  response: AuthenticationResponseJSON,
) {
  const user = await db
    .selectFrom("users")
    .select(["id", "role"])
    .where("email", "=", email)
    .where("is_active", "=", 1)
    .executeTakeFirstOrThrow();

  const challengeRecord = await db
    .selectFrom("webauthn_challenges")
    .select(["id", "challenge", "expires_at"])
    .where("user_id", "=", user.id)
    .where("type", "=", "authentication")
    .orderBy("created_at", "desc")
    .executeTakeFirst();

  if (!challengeRecord || Date.now() >= challengeRecord.expires_at) {
    throw new Error("Challenge expired");
  }

  await db
    .deleteFrom("webauthn_challenges")
    .where("id", "=", challengeRecord.id)
    .execute();

  const passkey = await db
    .selectFrom("passkeys")
    .selectAll()
    .where("id", "=", response.id)
    .where("user_id", "=", user.id)
    .executeTakeFirstOrThrow();

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challengeRecord.challenge,
    expectedOrigin: ORIGIN,
    expectedRPID: RP_ID,
    authenticator: {
      credentialID: Buffer.from(passkey.id, "base64url"),
      credentialPublicKey: Buffer.from(passkey.public_key, "base64url"),
      counter: passkey.counter,
      transports: passkey.transports
        ? (JSON.parse(passkey.transports) as AuthenticatorTransport[])
        : undefined,
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

  const session = await getAuthSession();
  await session.update({
    userId: user.id,
    role: user.role,
    passkeyVerified: true,
    createdAt: Date.now(),
  });

  return { success: true, user };
}

export async function countUserPasskeys(userId: number): Promise<number> {
  const result = await db
    .selectFrom("passkeys")
    .select((eb) => eb.fn.count<number>("id").as("count"))
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (!result) return 0;
  return typeof result.count === "number"
    ? result.count
    : Number.parseInt(String(result.count), 10);
}
