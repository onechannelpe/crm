import { afterAll, beforeAll, bench, describe } from "vitest";

import { hashPassword } from "~/lib/auth/password/password";
import { authenticatePasswordLogin } from "~/lib/auth/password/password-login";
import { hashAuthKey } from "~/lib/auth/password/key-hash";
import { buildThrottleKeys } from "~/lib/auth/password/throttle-keys";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import { fixedIterations } from "./shared";

const AUTH_BENCH_PASSWORD = "Secret123!";
const AUTH_BENCH_USER_POOL_SIZE = 256;
const AUTH_BENCH_USER_ID_START = 10_000;
const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};

interface AuthLoginFixture {
  email: string;
  ipAddress: string;
}

describe("auth login and throttle performance", () => {
  let ctx: TestDbContext | null = null;
  let loginFixtures: AuthLoginFixture[] = [];
  let fixtureCursor = 0;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("auth-login-bench");
    const passwordHash = await hashPassword(AUTH_BENCH_PASSWORD);
    const now = Date.now();

    const users = Array.from({ length: AUTH_BENCH_USER_POOL_SIZE }, (_, i) => {
      const id = AUTH_BENCH_USER_ID_START + i;
      return {
        id,
        branch_id: 1,
        team_id: null,
        email: `bench-auth-${id}@test.local`,
        password_hash: passwordHash,
        full_name: `Bench Auth ${id}`,
        phone_e164: `+5199001${String(i).padStart(4, "0")}`,
        phone_verified_at: now,
        profile_confirmed_at: now,
        onboarding_completed_at: now,
        strong_auth_required: 0,
        strong_auth_enrolled_at: null,
        role: "executive" as const,
        is_active: 1,
        created_at: now,
      };
    });

    await ctx.db.insertInto("users").values(users).execute();
    loginFixtures = users.map((user, i) => ({
      email: user.email,
      ipAddress: `198.51.100.${(i % 200) + 1}`,
    }));

    await ctx.db
      .insertInto("auth_events")
      .values(
        loginFixtures.map((fixture, i) => ({
          user_id: users[i].id,
          method: "password" as const,
          stage: "login" as const,
          outcome: "success" as const,
          reason: null,
          identifier_hash: hashAuthKey(`id:${fixture.email}`),
          ip_hash: hashAuthKey(`ip:${fixture.ipAddress}`),
          created_at: now,
        })),
      )
      .execute();
  });

  afterAll(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  bench(
    "action path: authenticate password login",
    async () => {
      const fixture = loginFixtures[fixtureCursor];
      fixtureCursor += 1;
      if (!fixture) {
        throw new Error("benchmark pool exhausted before iterations completed");
      }

      const result = await authenticatePasswordLogin(
        {
          email: fixture.email,
          password: AUTH_BENCH_PASSWORD,
          ipAddress: fixture.ipAddress,
          userAgent: "codspeed-bench",
        },
        {
          repos: ctx!.repos,
          sendPrivilegedLoginAlert,
        },
      );

      if (!result.token) {
        throw new Error("expected non-empty session token");
      }
    },
    fixedIterations(AUTH_BENCH_USER_POOL_SIZE),
  );

  bench(
    "component path: build throttle key map",
    () => {
      const keys = buildThrottleKeys(
        "password_login",
        "exec1@test.local",
        "198.51.100.44",
      );

      if (keys.account.length !== 64 || keys.ip.length !== 64) {
        throw new Error("expected sha256-sized throttle keys");
      }
    },
    fixedIterations(20_000),
  );

  bench(
    "component path: hash auth key",
    () => {
      const hash = hashAuthKey("ip:password_login:198.51.100.44");
      if (hash.length !== 64) {
        throw new Error(`expected hash length 64, got ${hash.length}`);
      }
    },
    fixedIterations(20_000),
  );
});
