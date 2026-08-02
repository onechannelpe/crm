import { TEST_FIXTURES } from "@tests/support/runtime/db";
import { afterAll, beforeAll, beforeEach, bench, describe } from "vitest";

import { BranchId, UserId } from "~/domain/ids";
import type { InviteService } from "~/server/invites/application/types";
import { createInviteServiceForExecutor } from "~/server/invites/infrastructure/invite-service-factory";

import { createBenchDbFixture } from "../_shared/fixture";
import { SINGLE_CALL } from "../_shared/options";
import { freshInviteEmail } from "./fixtures";

describe("team invite create benchmark", () => {
  const db = createBenchDbFixture("bench-team-invite-create");
  let inviteCreate!: (
    input: Parameters<InviteService["createInvite"]>[0],
  ) => ReturnType<InviteService["createInvite"]>;
  let email = "";
  const actorUserId = UserId.trust(TEST_FIXTURES.users.superUser.id);
  const branchId = BranchId.trust(TEST_FIXTURES.branches.norte.id);

  beforeAll(async () => {
    const ctx = await db.setup();
    const inviteService = createInviteServiceForExecutor(ctx.db);
    inviteCreate = (input) => inviteService.createInvite(input, new Date());
  });

  beforeEach(() => {
    email = freshInviteEmail();
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "service path: create invite",
    async () => {
      const result = await inviteCreate({
        actorUserId,
        actorRole: "superuser",
        branchId,
        names: "Bench Create",
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
    SINGLE_CALL,
  );
});
