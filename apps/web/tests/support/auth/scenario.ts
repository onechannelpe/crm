import {
  enableIdentityPasskey,
  enableIdentityTotp,
  getSeededIdentity,
  setIdentityOnboarding,
  setIdentityPassword,
  type SeededIdentityName,
} from "@tests/support/identities/api";
import { createTestPasskeyProvider } from "@tests/support/passkey/api";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  resetTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { vi } from "vitest";

import type { AuthLoginFlowId } from "~/domain/ids";
import { completePendingLogin } from "~/server/auth/flows/complete-pending-login";
import { submitPasswordLogin } from "~/server/auth/flows/submit-password-login";
import { verifyTotpLoginProof } from "~/server/auth/flows/verify-pending-login";
import { createAuthLoginContext } from "~/server/auth/infrastructure/login-context";
import { decryptTotpSecret } from "~/server/auth/totp/secret-crypto";
import { generateCurrentTotpCode } from "~/server/auth/totp/totp";
import { Err, isErr, Ok } from "~/shared/result";

interface RequestMeta {
  ipAddress: string;
  userAgent: string;
}

export function createAuthScenario(
  dbName: string,
  options?: { freezeAtMs?: number },
) {
  let ctx!: TestDbContext;

  return {
    async setup() {
      ctx = await createIsolatedTestDb(dbName);
    },

    async reset() {
      await resetTestDb(ctx);

      vi.useRealTimers();

      if (options?.freezeAtMs != null) {
        vi.useFakeTimers({ toFake: ["Date"] });
        vi.setSystemTime(options.freezeAtMs);
      }
    },

    async teardown() {
      vi.useRealTimers();
      await cleanupTestDb(ctx);
    },

    get ctx() {
      return ctx;
    },

    identity(name: SeededIdentityName) {
      return getSeededIdentity(name);
    },

    async setPassword(name: SeededIdentityName, password: string) {
      await setIdentityPassword(ctx, getSeededIdentity(name), password);
    },

    async setOnboarding(name: SeededIdentityName, completed: boolean) {
      await setIdentityOnboarding(ctx, getSeededIdentity(name), completed);
    },

    async enableTotp(name: SeededIdentityName) {
      await enableIdentityTotp(ctx, getSeededIdentity(name));
    },

    async enablePasskey(name: SeededIdentityName, passkeyId?: string) {
      await enableIdentityPasskey(ctx, getSeededIdentity(name), passkeyId);
    },

    async linkGoogleAccount(name: SeededIdentityName, sub: string) {
      const identity = getSeededIdentity(name);

      await ctx.repos.oauthAccounts.create({
        user_id: identity.userId,
        provider: "google",
        provider_user_id: sub,
        email: `${sub}@example.test`,
        created_at: new Date(),
      });
    },

    async currentTotpCode(name: SeededIdentityName): Promise<string> {
      const identity = getSeededIdentity(name);
      const factor = await ctx.repos.userTotpFactors.findByUserId(
        identity.userId,
      );

      if (factor == null) {
        throw new Error("totp factor not found");
      }

      const secret = await decryptTotpSecret(factor.secret_encrypted);

      return generateCurrentTotpCode(secret);
    },

    async loginPassword(
      name: SeededIdentityName,
      password: string,
      meta: RequestMeta,
    ) {
      const identity = getSeededIdentity(name);
      const login = createAuthLoginContext(ctx.db);

      return submitPasswordLogin(
        {
          identifier: identity.username,
          password,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
        login,
        createTestPasskeyProvider(login.repos),
      );
    },

    async loginByIdentifier(
      identifier: string,
      password: string,
      meta: RequestMeta,
    ) {
      const login = createAuthLoginContext(ctx.db);

      return submitPasswordLogin(
        {
          identifier,
          password,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
        login,
        createTestPasskeyProvider(login.repos),
      );
    },

    async loginTotp(
      flowId: AuthLoginFlowId,
      totpCode: string,
      meta: RequestMeta,
    ) {
      const login = createAuthLoginContext(ctx.db);
      const occurredAt = login.now();
      const verified = await verifyTotpLoginProof(login, {
        flowId,
        totpCode,
        ipAddress: meta.ipAddress,
        occurredAt,
      });
      if (isErr(verified)) return verified;

      const completed = await completePendingLogin(login, {
        proof: verified.value,
        occurredAt,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
      });
      return isErr(completed)
        ? Err({ kind: "flow_expired" } as const)
        : Ok(completed.value);
    },
  };
}
