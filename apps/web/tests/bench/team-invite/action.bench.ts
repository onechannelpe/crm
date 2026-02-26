import { afterAll, beforeAll, bench, describe } from "vitest";

import { createUserProvisioningService } from "~/server/users/service-user-provisioning";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import {
  ACCEPT_POOL_SIZE,
  CREATE_POOL_SIZE,
  type AcceptFixture,
  seedTeamInviteFixtures,
} from "./fixtures";

describe("team invite action benchmark", () => {
  let ctx: TestDbContext | null = null;
  let provisioning: ReturnType<typeof createUserProvisioningService> | null =
    null;
  let createEmails: string[] = [];
  let acceptFixtures: AcceptFixture[] = [];
  const createCursor = { value: 0 };
  const acceptCursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-team-invite-action");
    provisioning = createUserProvisioningService(ctx.repos, {
      now: () => BENCH_NOW,
    });

    const fixtures = await seedTeamInviteFixtures(ctx);
    createEmails = fixtures.createEmails;
    acceptFixtures = fixtures.acceptFixtures;
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
    provisioning = null;
  });

  bench(
    "action path: create invite",
    async () => {
      const email = takeFromPool(
        createEmails,
        createCursor,
        "team-invite-create pool exhausted before iterations completed",
      );

      const result = await provisioning!.createInvite({
        actorUserId: 5,
        actorRole: "superuser",
        branchId: 2,
        fullName: `Bench Create ${createCursor.value}`,
        email,
        role: "executive",
        teamId: null,
      });

      if (!result.ok) {
        throw new Error(
          `expected invite create success, got ${result.error.message}`,
        );
      }
    },
    fixedIterations(CREATE_POOL_SIZE),
  );

  bench(
    "action path: accept invite",
    async () => {
      const fixture = takeFromPool(
        acceptFixtures,
        acceptCursor,
        "team-invite-accept pool exhausted before iterations completed",
      );

      const result = await provisioning!.acceptInvite({
        token: fixture.token,
        fullName: fixture.fullName,
        passwordHash: "bench-password-hash",
      });

      if (!result.ok) {
        throw new Error(
          `expected invite accept success, got ${result.error.message}`,
        );
      }
    },
    fixedIterations(ACCEPT_POOL_SIZE),
  );
});
