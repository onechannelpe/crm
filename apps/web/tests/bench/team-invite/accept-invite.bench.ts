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
import {
  ACCEPT_POOL_SIZE,
  type AcceptFixture,
  seedTeamInviteFixtures,
} from "./fixtures";

describe("team invite accept benchmark", () => {
  let ctx: TestDbContext | null = null;
  let inviteAccept: InviteService["acceptInvite"] | null = null;
  let acceptFixtures: AcceptFixture[] = [];
  const acceptCursor = { value: 0 };

  beforeAll(async () => {
    ctx = await createIsolatedTestDb("bench-team-invite-accept");
    const kit = createInviteTestKit(ctx, {
      now: () => BENCH_NOW,
    });
    inviteAccept = kit.commands.accept;

    const fixtures = await seedTeamInviteFixtures(ctx);
    acceptFixtures = fixtures.acceptFixtures;
  });

  afterAll(async () => {
    if (!ctx) return;
    await cleanupTestDb(ctx);
    ctx = null;
    inviteAccept = null;
  });

  bench(
    "service path: accept invite",
    async () => {
      const fixture = takeFromPool(
        acceptFixtures,
        acceptCursor,
        "team-invite-accept pool exhausted before iterations completed",
      );

      const result = await inviteAccept!({
        token: fixture.token,
        password: "bench-password-hash",
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
