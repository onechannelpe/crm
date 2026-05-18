import { afterAll, beforeAll, bench, describe } from "vitest";

import type { InviteService } from "~/server/invites/application/types";
import { createInviteServiceContext } from "~/server/invites/infrastructure/invite-service-context";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { CREATE_POOL_SIZE, seedTeamInviteFixtures } from "./fixtures";

describe("team invite create benchmark", () => {
  const db = createBenchDbFixture("bench-team-invite-create");
  let inviteCreate!: InviteService["createInvite"];
  let createEmails: string[] = [];
  const createCursor = { value: 0 };

  beforeAll(async () => {
    const ctx = await db.setup();
    const { inviteService } = createInviteServiceContext(ctx.db);
    inviteCreate = (input) => inviteService.createInvite(input);

    const fixtures = await seedTeamInviteFixtures(ctx);
    createEmails = fixtures.createEmails;
  });

  afterAll(async () => {
    await db.teardown();
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
