import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { afterAll, beforeAll, bench, describe } from "vitest";

import type { InviteService } from "~/server/invites/application/types";
import { createInviteServiceForExecutor } from "~/server/invites/infrastructure/invite-service-factory";
import { asBranchId, asUserId } from "~/server/shared/ids";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { CREATE_POOL_SIZE, seedTeamInviteFixtures } from "./fixtures";

describe("team invite create benchmark", () => {
  const db = createBenchDbFixture("bench-team-invite-create");
  let inviteCreate!: InviteService["createInvite"];
  let createEmails: string[] = [];
  const createCursor = { value: 0 };
  const actorUserId = asUserId(TEST_FIXTURES.users.superUser.id);
  const branchId = asBranchId(TEST_FIXTURES.branches.norte.id);

  beforeAll(async () => {
    const ctx = await db.setup();
    const inviteService = createInviteServiceForExecutor(ctx.db);
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
        actorUserId,
        actorRole: "superuser",
        branchId,
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
          `expected invite create success, got ${result.error.code ?? result.error.kind}`,
        );
      }
    },
    fixedIterations(CREATE_POOL_SIZE),
  );
});
