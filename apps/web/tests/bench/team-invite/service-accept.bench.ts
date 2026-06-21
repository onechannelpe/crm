import { afterAll, beforeAll, bench, describe } from "vitest";

import type { InviteService } from "~/server/invites/application/types";
import { createInviteServiceContext } from "~/server/invites/infrastructure/invite-service-context";

import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import {
  ACCEPT_POOL_SIZE,
  type AcceptFixture,
  seedTeamInviteFixtures,
} from "./fixtures";

describe("team invite accept benchmark", () => {
  const db = createBenchDbFixture("bench-team-invite-accept-service");
  let inviteAccept!: InviteService["acceptInvite"];
  let acceptFixtures: AcceptFixture[] = [];
  const acceptCursor = { value: 0 };

  beforeAll(async () => {
    const ctx = await db.setup();
    const { inviteService } = createInviteServiceContext(ctx.db);
    inviteAccept = (input) => inviteService.acceptInvite(input);

    const fixtures = await seedTeamInviteFixtures(ctx);
    acceptFixtures = fixtures.acceptFixtures;
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "service path: accept invite",
    async () => {
      const fixture = takeFromPool(
        acceptFixtures,
        acceptCursor,
        "team-invite-accept service pool exhausted before iterations completed",
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
