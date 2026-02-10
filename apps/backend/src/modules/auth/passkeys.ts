import type {
  AuthenticationResponseJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/server";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "@simplewebauthn/server";
import type { Passkey } from "../../db/schema";
import { db } from "../../db/client";

const CHALLENGE_TTL_MS = 1000 * 60 * 5;

const PASSKEY_REQUIRED_ROLES = new Set(["admin", "sales_manager"] as const);

type AuthenticatorTransport =
  | "usb"
  | "ble"
  | "nfc"
  | "internal"
  | "hybrid"
  | "cable";

function getRpId(): string {
  return process.env.AUTH_RP_ID ?? "localhost";
}

function getOrigin(): string {
  return process.env.AUTH_ORIGIN ?? "http://localhost:3000";
}

export function isPasskeyRequired(role: string): boolean {
  return PASSKEY_REQUIRED_ROLES.has(role as "admin" | "sales_manager");
}

async function createChallenge(
  type: "registration" | "authentication",
  userId: number | null,
  challenge: string,
): Promise<void> {
  const now = Date.now();
  await db
    .insertInto("webauthn_challenges")
    .values({
      user_id: userId,
      type,
      challenge,
      created_at: now,
      expires_at: now + CHALLENGE_TTL_MS,
    })
    .execute();
}

async function consumeLatestChallenge(
  type: "registration" | "authentication",
  userId: number | null,
): Promise<{ id: number; challenge: string } | null> {
  const now = Date.now();
  const entry = await db
    .selectFrom("webauthn_challenges")
    .select(["id", "challenge", "expires_at"])
    .where("type", "=", type)
    .where("user_id", userId === null ? "is" : "=", userId)
    .orderBy("created_at", "desc")
    .executeTakeFirst();

  if (!entry || now >= entry.expires_at) return null;

  await db
    .deleteFrom("webauthn_challenges")
    .where("id", "=", entry.id)
    .execute();
  return { id: entry.id, challenge: entry.challenge };
}

async function listUserPasskeys(userId: number): Promise<Passkey[]> {
  return await db
    .selectFrom("passkeys")
    .selectAll()
    .where("user_id", "=", userId)
    .execute();
}

export async function buildRegistrationOptions(userId: number, email: string) {
  const existing = await listUserPasskeys(userId);
  const options = await generateRegistrationOptions({
    rpName: "CRM",
    rpID: getRpId(),
    userID: userId.toString(),
    userName: email,
    attestationType: "none",
    authenticatorSelection: {
      userVerification: "required",
    },
    excludeCredentials: existing.map((passkey) => ({
      id: passkey.id,
      type: "public-key",
      transports: passkey.transports
        ? (JSON.parse(passkey.transports) as AuthenticatorTransport[])
        : undefined,
    })),
  });

  await createChallenge("registration", userId, options.challenge);
  return options;
}

export async function verifyRegistration(
  userId: number,
  response: RegistrationResponseJSON,
): Promise<boolean> {
  const challenge = await consumeLatestChallenge("registration", userId);
  if (!challenge) return false;

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: getOrigin(),
    expectedRPID: getRpId(),
    requireUserVerification: true,
  });

  if (!verification.verified || !verification.registrationInfo) return false;

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

  return true;
}

export async function buildAuthenticationOptions(userId: number) {
  const existing = await listUserPasskeys(userId);
  const options = await generateAuthenticationOptions({
    rpID: getRpId(),
    userVerification: "required",
    allowCredentials: existing.map((passkey) => ({
      id: passkey.id,
      type: "public-key",
      transports: passkey.transports
        ? (JSON.parse(passkey.transports) as AuthenticatorTransport[])
        : undefined,
    })),
  });

  await createChallenge("authentication", userId, options.challenge);
  return options;
}

export async function verifyAuthentication(
  userId: number,
  response: AuthenticationResponseJSON,
): Promise<{ verified: boolean; passkeyId?: string }> {
  const challenge = await consumeLatestChallenge("authentication", userId);
  if (!challenge) return { verified: false };

  const passkey = await db
    .selectFrom("passkeys")
    .selectAll()
    .where("id", "=", response.id)
    .where("user_id", "=", userId)
    .executeTakeFirst();

  if (!passkey) return { verified: false };

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge.challenge,
    expectedOrigin: getOrigin(),
    expectedRPID: getRpId(),
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

  if (!verification.verified) return { verified: false };

  await db
    .updateTable("passkeys")
    .set({
      counter: verification.authenticationInfo.newCounter,
      last_used_at: Date.now(),
    })
    .where("id", "=", passkey.id)
    .execute();

  return { verified: true, passkeyId: passkey.id };
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
