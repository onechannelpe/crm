import { afterAll, beforeAll, bench, describe } from "vitest";

import { hashAuthKey } from "~/lib/auth/password/key-hash";
import { authenticatePasswordLogin } from "~/lib/auth/password/password-login";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import {
  LOGIN_PASSWORD,
  LOGIN_POOL_SIZE,
  type LoginFixture,
  seedAuthLoginFixtures,
} from "./fixtures";

const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};

describe("auth login action benchmark", () => {
  let ctx: TestDbContext | null = null;
  let fixtures: LoginFixture[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-auth-login-action");
    fixtures = await seedAuthLoginFixtures(ctx);

    await ctx.db
      .insertInto("auth_events")
      .values(
        fixtures.map((fixture, index) => ({
          user_id: 10_000 + index,
          method: "password" as const,
          stage: "login" as const,
          outcome: "success" as const,
          reason: null,
          identifier_hash: hashAuthKey(`id:${fixture.email}`),
          ip_hash: hashAuthKey(`ip:${fixture.ipAddress}`),
          created_at: BENCH_NOW,
        })),
      )
      .execute();
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
  });

  bench(
    "action path: authenticate password login",
    async () => {
      const fixture = takeFromPool(
        fixtures,
        cursor,
        "auth-login pool exhausted before iterations completed",
      );

      const result = await authenticatePasswordLogin(
        {
          email: fixture.email,
          password: LOGIN_PASSWORD,
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
    fixedIterations(LOGIN_POOL_SIZE),
  );
});
