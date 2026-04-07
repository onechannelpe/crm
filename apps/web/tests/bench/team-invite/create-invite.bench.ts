import { afterAll, beforeAll, bench, describe } from "vitest";

import { createInviteService } from "~/server/invites/application/invite-service";

import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "../../support/test-db";
import { BENCH_NOW } from "../_shared/constants";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { CREATE_POOL_SIZE, seedTeamInviteFixtures } from "./fixtures";

describe("team invite create benchmark", () => {
  let ctx: TestDbContext | null = null;
  let inviteService: ReturnType<typeof createInviteService> | null = null;
  let createEmails: string[] = [];
  const createCursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-team-invite-create");
    inviteService = createInviteService(ctx.repos, {
      now: () => BENCH_NOW,
    });

    const fixtures = await seedTeamInviteFixtures(ctx);
    createEmails = fixtures.createEmails;
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
    inviteService = null;
  });

  bench(
    "service path: create invite",
    async () => {
      const email = takeFromPool(
        createEmails,
        createCursor,
        "team-invite-create pool exhausted before iterations completed",
      );

      const result = await inviteService!.createInvite({
        actorUserId: 5,
        actorRole: "superuser",
        branchId: 2,
        names: `Bench Create ${createCursor.value}`,
        firstSurname: "User",
        secondSurname: "Bench",
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
});
