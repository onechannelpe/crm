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

import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { decryptTotpSecret } from "~/lib/auth/totp/secret-crypto";
import { generateCurrentTotpCode } from "~/lib/auth/totp/totp";
import { submitPasswordLogin } from "~/server/auth/flows/submit-password-login";
import { submitTotpForLoginFlow } from "~/server/auth/flows/submit-totp-login";

const NOOP_PRIVILEGED_ALERT: SendPrivilegedLoginAlert = async () => {};

interface RequestMeta {
  ipAddress: string;
  userAgent: string;
}

type TotpFlowId = Parameters<typeof submitTotpForLoginFlow>[0]["flowId"];

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
      reposOverride?: TestDbContext["repos"],
    ) {
      const identity = getSeededIdentity(name);
      const repos = reposOverride ?? ctx.repos;

      return submitPasswordLogin(
        {
          identifier: identity.username,
          password,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
        repos,
        NOOP_PRIVILEGED_ALERT,
        createTestPasskeyProvider(repos),
      );
    },

    async loginByIdentifier(
      identifier: string,
      password: string,
      meta: RequestMeta,
      reposOverride?: TestDbContext["repos"],
    ) {
      const repos = reposOverride ?? ctx.repos;

      return submitPasswordLogin(
        {
          identifier,
          password,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
        repos,
        NOOP_PRIVILEGED_ALERT,
        createTestPasskeyProvider(repos),
      );
    },

    async loginTotp(flowId: TotpFlowId, totpCode: string, meta: RequestMeta) {
      return submitTotpForLoginFlow(
        {
          flowId,
          totpCode,
          ipAddress: meta.ipAddress,
          userAgent: meta.userAgent,
        },
        ctx.repos,
        NOOP_PRIVILEGED_ALERT,
      );
    },
  };
}
