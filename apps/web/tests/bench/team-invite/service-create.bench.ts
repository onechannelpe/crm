import { afterAll, beforeAll, bench, describe } from "vitest";

import type { InviteService } from "~/server/invites/application/types";

import { createInviteTestKit } from "../../support/invite-test-kit";
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
  let ctx!: TestDbContext;
  let inviteCreate!: InviteService["createInvite"];
  let createEmails: string[] = [];
  const createCursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-team-invite-create");
    const kit = createInviteTestKit(ctx, {
      now: () => BENCH_NOW,
    });
    inviteCreate = kit.commands.create;

    const fixtures = await seedTeamInviteFixtures(ctx);
    createEmails = fixtures.createEmails;
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  bench(
    "service path: create invite",
    async () => {
      const email = takeFromPool(
        createEmails,
        createCursor,
        "team-invite-create pool exhausted before iterations completed",
      );

      const result = await inviteCreate({
        actorUserId: 5,
        actorRole: "superuser",
        branchId: 2,
        names: `Bench Create ${createCursor.value}`,
        firstSurname: "User",
        secondSurname: "Bench",
        email,
        role: "executive",
        executiveCategory: "elite",
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
