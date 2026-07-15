import { createTestPasskeyProvider } from "@tests/support/passkey/api";
import { afterAll, beforeAll, beforeEach, bench, describe } from "vitest";

import { submitPasswordLogin } from "~/server/auth/flows/submit-password-login";
import { createAuthLoginContext } from "~/server/auth/infrastructure/login-context";
import { isErr } from "~/server/shared/result";

import { createBenchDbFixture } from "../_shared/fixture";
import { SINGLE_CALL } from "../_shared/options";
import {
  LOGIN_PASSWORD,
  type LoginFixture,
  resetLoginState,
  seedAuthLoginUser,
} from "./fixtures";

describe("auth login service benchmark", () => {
  const db = createBenchDbFixture("bench-auth-login-service");
  let fixture: LoginFixture;

  beforeAll(async () => {
    const ctx = await db.setup();
    fixture = await seedAuthLoginUser(ctx);
  });

  beforeEach(async () => {
    await resetLoginState(db.ctx(), fixture.userId);
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "service path: authenticate password login",
    async () => {
      const ctx = db.ctx();
      const result = await submitPasswordLogin(
        {
          identifier: fixture.username,
          password: LOGIN_PASSWORD,
          ipAddress: fixture.ipAddress,
          userAgent: "codspeed-bench",
        },
        createAuthLoginContext(ctx.db),
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
    SINGLE_CALL,
  );
});
