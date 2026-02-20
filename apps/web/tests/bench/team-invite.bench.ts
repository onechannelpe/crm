import { afterAll, beforeAll, bench, describe } from "vitest";

import { createUserProvisioningService } from "~/server/users/service-user-provisioning";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../support/test-db";
import { fixedIterations } from "./shared";

const TEAM_INVITE_CREATE_POOL_SIZE = 80;
const TEAM_INVITE_ACCEPT_POOL_SIZE = 80;
const BENCH_NOW = 10_000_000;

describe("team invite performance", () => {
  let ctx: TestDbContext | null = null;
  let createEmails: string[] = [];
  let acceptFixtures: Array<{ token: string; fullName: string }> = [];
  let createCursor = 0;
  let acceptCursor = 0;

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("team-invite-bench");
    const benchCtx = ctx;
    if (!benchCtx) {
      throw new Error("expected benchmark db context");
    }

    const provisioning = createUserProvisioningService(benchCtx.repos, {
      now: () => BENCH_NOW,
    });

    createEmails = Array.from(
      { length: TEAM_INVITE_CREATE_POOL_SIZE },
      (_, i) => `bench-team-create-${i}@test.local`,
    );

    for (let i = 0; i < TEAM_INVITE_ACCEPT_POOL_SIZE; i += 1) {
      // oxlint-disable-next-line no-await-in-loop
      const created = await provisioning.createInvite({
        actorUserId: 5,
        actorRole: "superuser",
        branchId: 2,
        fullName: `Bench Accept ${i}`,
        email: `bench-team-accept-${i}@test.local`,
        role: "executive",
        teamId: null,
      });
      if (!created.ok) {
        throw new Error(
          `expected invite create success for accept pool, got ${created.error}`,
        );
      }
      acceptFixtures.push({
        token: created.value.token,
        fullName: `Bench Accepted ${i}`,
      });
    }
  });

  afterAll(async () => {
    if (ctx) {
      await cleanupTestDb(ctx);
      ctx = null;
    }
  });

  bench(
    "action path: create team invite",
    async () => {
      const email = createEmails[createCursor];
      createCursor += 1;
      if (!email) {
        throw new Error(
          "create-invite pool exhausted before iterations completed",
        );
      }

      const result = await createUserProvisioningService(ctx!.repos, {
        now: () => BENCH_NOW,
      }).createInvite({
        actorUserId: 5,
        actorRole: "superuser",
        branchId: 2,
        fullName: `Bench Create ${createCursor}`,
        email,
        role: "executive",
        teamId: null,
      });

      if (!result.ok) {
        throw new Error(`expected invite create success, got ${result.error}`);
      }
    },
    fixedIterations(TEAM_INVITE_CREATE_POOL_SIZE),
  );

  bench(
    "action path: accept team invite",
    async () => {
      const fixture = acceptFixtures[acceptCursor];
      acceptCursor += 1;
      if (!fixture) {
        throw new Error(
          "accept-invite pool exhausted before iterations completed",
        );
      }

      const result = await createUserProvisioningService(ctx!.repos, {
        now: () => BENCH_NOW,
      }).acceptInvite({
        token: fixture.token,
        fullName: fixture.fullName,
        passwordHash: "bench-password-hash",
      });
      if (!result.ok) {
        throw new Error(`expected invite accept success, got ${result.error}`);
      }
    },
    fixedIterations(TEAM_INVITE_ACCEPT_POOL_SIZE),
  );
});
