import { createTestPasskeyProvider } from "@tests/support/passkey/api";
import { afterAll, beforeAll, bench, describe } from "vitest";

import { hashAuthKey } from "~/lib/auth/password/key-hash";
import type { SendPrivilegedLoginAlert } from "~/lib/auth/security/privileged-login-alert";
import { submitPasswordLogin } from "~/server/auth/flows/submit-password-login";
import { isErr } from "~/server/shared/result";

import { BENCH_NOW } from "../_shared/constants";
import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import {
  LOGIN_PASSWORD,
  LOGIN_POOL_SIZE,
  type LoginFixture,
  seedAuthLoginFixtures,
} from "./fixtures";

const sendPrivilegedLoginAlert: SendPrivilegedLoginAlert = async () => {};

describe("auth login service benchmark", () => {
  const db = createBenchDbFixture("bench-auth-login-service");
  let fixtures: LoginFixture[] = [];
  const cursor = { value: 0 };

  beforeAll(async () => {
    const ctx = await db.setup();
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
          identifier_hash: hashAuthKey(`id:${fixture.username}`),
          ip_hash: hashAuthKey(`ip:${fixture.ipAddress}`),
          created_at: BENCH_NOW,
        })),
      )
      .execute();
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "service path: authenticate password login",
    async () => {
      const fixture = takeFromPool(
        fixtures,
        cursor,
        "auth-login pool exhausted before iterations completed",
      );
      const ctx = db.ctx();

      const result = await submitPasswordLogin(
        {
          identifier: fixture.username,
          password: LOGIN_PASSWORD,
          ipAddress: fixture.ipAddress,
          userAgent: "codspeed-bench",
        },
        ctx.repos,
        sendPrivilegedLoginAlert,
        createTestPasskeyProvider(ctx.repos),
      );

      if (
        isErr(result) ||
        result.value.kind !== "complete" ||
        !result.value.result.token
      ) {
        throw new Error("expected non-empty session token");
      }
    },
    fixedIterations(LOGIN_POOL_SIZE),
  );
});
