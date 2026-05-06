import { afterAll, beforeAll, bench, describe } from "vitest";

import { BENCH_NOW } from "../_shared/constants";
import { createBenchDbFixture } from "../_shared/fixture";
import { fixedIterations } from "../_shared/options";
import { takeFromPool } from "../_shared/pool";
import { QUERY_POOL_SIZE, seedTeamInviteFixtures } from "./fixtures";

describe("team invite repository benchmark", () => {
  const db = createBenchDbFixture("bench-team-invite-repository");
  let pendingInviteTokenHashes: string[] = [];
  const queryCursor = { value: 0 };

  beforeAll(async () => {
    const ctx = await db.setup();
    const fixtures = await seedTeamInviteFixtures(ctx);
    pendingInviteTokenHashes = fixtures.pendingInviteTokenHashes;
  });

  afterAll(async () => {
    await db.teardown();
  });

  bench(
    "repository path: load pending invite by token hash",
    async () => {
      const tokenHash = takeFromPool(
        pendingInviteTokenHashes,
        queryCursor,
        "team-invite repository pool exhausted before iterations completed",
      );
      const ctx = db.ctx();

      const row = await ctx.repos.userInvites.findPendingByTokenHash(
        tokenHash,
        BENCH_NOW,
      );
      if (!row) {
        throw new Error("expected pending invite row for token hash");
      }
    },
    fixedIterations(QUERY_POOL_SIZE),
  );
});
