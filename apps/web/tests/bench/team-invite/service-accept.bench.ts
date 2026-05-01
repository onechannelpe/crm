import { afterAll, beforeAll, bench, describe } from "vitest";

import type { InviteService } from "~/server/invites/application/types";

import { createInviteTestKit } from "@tests/support/invite/api";
import {
  cleanupTestDb,
  createIsolatedTestDb,
  type TestDbContext,
} from "@tests/support/runtime/db";
import { BENCH_NOW } from "../_shared/constants";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import {
  ACCEPT_POOL_SIZE,
  type AcceptFixture,
  seedTeamInviteFixtures,
} from "./fixtures";

describe("team invite accept benchmark", () => {
  let ctx!: TestDbContext;
  let inviteAccept!: InviteService["acceptInvite"];
  let acceptFixtures: AcceptFixture[] = [];
  const acceptCursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-team-invite-accept-service");
    const kit = createInviteTestKit(ctx, {
      now: () => BENCH_NOW,
    });
    inviteAccept = kit.commands.accept;

    const fixtures = await seedTeamInviteFixtures(ctx);
    acceptFixtures = fixtures.acceptFixtures;
  });

  afterAll(async () => {
    await cleanupTestDb(ctx);
  });

  bench(
    "service path: accept invite (with password hash)",
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
          `expected invite accept success, got ${result.error.message}`,
        );
      }
    },
    fixedIterations(ACCEPT_POOL_SIZE),
  );
});
