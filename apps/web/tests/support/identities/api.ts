import { hashPassword } from "~/lib/auth/password/password";
import { encryptTotpSecret } from "~/lib/auth/totp/secret-crypto";
import { generateTotpSecret } from "~/lib/auth/totp/totp";

import {
  getSeededIdentity,
  type SeededIdentityName,
  type TestIdentity,
} from "../identities/catalog";
import type { TestDbContext } from "../runtime/db";

export { getSeededIdentity };
export type { SeededIdentityName, TestIdentity };

export async function setIdentityPassword(
  ctx: TestDbContext,
  identity: TestIdentity,
  password: string,
): Promise<void> {
  await ctx.db
    .updateTable("users")
    .set({ password_hash: await hashPassword(password) })
    .where("id", "=", identity.userId)
    .execute();
}

export async function setIdentityOnboarding(
  ctx: TestDbContext,
  identity: TestIdentity,
  onboardingCompleted: boolean,
): Promise<void> {
  await ctx.db
    .updateTable("users")
    .set({ onboarding_completed_at: onboardingCompleted ? new Date() : null })
    .where("id", "=", identity.userId)
    .execute();
}

export async function enableIdentityPasskey(
  ctx: TestDbContext,
  identity: TestIdentity,
  passkeyId = `pk-${identity.username}`,
): Promise<void> {
  await ctx.repos.passkeys.create({
    id: passkeyId,
    user_id: identity.userId,
    public_key: "base64-public-key",
    counter: 0,
    transports: JSON.stringify(["internal"]),
    created_at: new Date(),
  });
}

export async function enableIdentityTotp(
  ctx: TestDbContext,
  identity: TestIdentity,
): Promise<void> {
  const factor = await ctx.repos.userTotpFactors.createOrRotate(
    identity.userId,
    await encryptTotpSecret(generateTotpSecret()),
    new Date(),
  );
  await ctx.repos.userTotpFactors.enableIfSecretMatches(
    identity.userId,
    factor.secret_encrypted,
    new Date(),
  );
}
