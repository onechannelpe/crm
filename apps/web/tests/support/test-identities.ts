import { hashPassword } from "../../src/lib/auth/password/password";
import { encryptTotpSecret } from "../../src/lib/auth/totp/secret-crypto";
import { generateTotpSecret } from "../../src/lib/auth/totp/totp";
import { createSessionService } from "../../src/server/auth/application/session-service";
import {
  getSeededIdentity,
  type SeededIdentityName,
  type TestIdentity,
} from "./identities/seeded-identities";
import type { TestDbContext } from "./test-db";

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
    .set({
      onboarding_completed_at: onboardingCompleted ? Date.now() : null,
      phone_e164: onboardingCompleted ? `+5199000${identity.userId}` : null,
    })
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
  });
}

export async function enableIdentityTotp(
  ctx: TestDbContext,
  identity: TestIdentity,
): Promise<void> {
  await ctx.repos.userTotpFactors.createOrRotate(
    identity.userId,
    await encryptTotpSecret(generateTotpSecret()),
  );
  await ctx.repos.userTotpFactors.markEnabled(identity.userId);
}

export async function createIdentitySession(
  ctx: TestDbContext,
  identity: TestIdentity,
  options?: {
    sessionClass?: "pre_auth" | "app";
    primaryAuthMethod?: "password" | "google" | "passkey";
    strongAuthMethod?: "totp" | "passkey" | "federated" | null;
    strongAuthAt?: number | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  },
): Promise<string> {
  return await createSessionService({
    sessions: ctx.repos.sessions,
    users: ctx.repos.users,
  }).createSession({
    userId: identity.userId,
    branchId: identity.branchId,
    role: identity.role,
    sessionClass: options?.sessionClass ?? "app",
    ipAddress: options?.ipAddress ?? "127.0.0.1",
    userAgent: options?.userAgent ?? "vitest-agent",
    primaryAuthMethod: options?.primaryAuthMethod ?? "password",
    strongAuthMethod: options?.strongAuthMethod ?? null,
    strongAuthAt: options?.strongAuthAt ?? null,
  });
}
