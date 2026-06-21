import { afterAll, beforeAll, bench, describe } from "vitest";

import { createInviteService } from "~/server/invites/application/invite-service";
import type { InviteService } from "~/server/invites/application/types";
import { bindInviteRepos } from "~/server/invites/infrastructure/invite-service-context";
import { createExecutorUow } from "~/server/shared/application/uow";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import {
  ACCEPT_POOL_SIZE,
  type AcceptFixture,
  seedTeamInviteFixtures,
} from "./fixtures";

describe("team invite accept command benchmark", () => {
  const db = createBenchDbFixture("bench-team-invite-accept-command");
  let inviteAccept!: InviteService["acceptInvite"];
  let acceptFixtures: AcceptFixture[] = [];
  const acceptCursor = { value: 0 };

  beforeAll(async () => {
    const ctx = await db.setup();
    const inviteService = createInviteService(bindInviteRepos(ctx.db), {
      uow: createExecutorUow(ctx.db, bindInviteRepos),
      hashPassword: async () => "bench-password-hash",
    });
    inviteAccept = (input) => inviteService.acceptInvite(input);

    const fixtures = await seedTeamInviteFixtures(ctx);
    acceptFixtures = fixtures.acceptFixtures;
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "command path: accept invite",
    async () => {
      const fixture = takeFromPool(
        acceptFixtures,
        acceptCursor,
        "team-invite-accept command pool exhausted before iterations completed",
      );

      const result = await inviteAccept({
        token: fixture.token,
        password: "StrongPass123",
      });

      if (!result.ok) {
        throw new Error(
          `expected invite accept success, got ${result.error.code ?? result.error.kind}`,
        );
      }
    },
    fixedIterations(ACCEPT_POOL_SIZE),
  );
});
